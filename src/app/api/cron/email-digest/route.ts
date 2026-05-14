import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Need max duration because emails can take a few seconds to send
export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
    try {
        // Enforce basic security -> only allow GET requests if they have the Vercel internal header, 
        // OR if you hit it locally for testing
        const authHeader = req.headers.get('authorization');
        const isVercelCron = req.headers.get('user-agent') === 'vercel-cron/1.0';

        // Uncomment to enforce auth strictly, left open temporarily so you can test it directly via browser!
        // if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // 1. Fetch any applications that have NOT been emailed yet
        const { data: newSubmissions, error: fetchError } = await supabaseAdmin
            .from('form_submissions')
            .select('id, company_name, created_at, form_data')
            .eq('email_notified', false)
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        if (!newSubmissions || newSubmissions.length === 0) {
            return NextResponse.json({ message: 'No new startup applications to notify about.' });
        }

        // 2. Fetch the target email list (Admins & Internal Team)
        const { data: teamMembers, error: userError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, role, name')
            .in('role', ['ADMIN', 'INTERNAL_TEAM'])
            .eq('status', 'ACTIVE');

        if (userError) throw userError;

        if (!teamMembers || teamMembers.length === 0) {
            return NextResponse.json({ message: 'No active Admins or Internal Team members found.' });
        }

        const emailAddresses: string[] = [];
        for (const member of teamMembers) {
            const { data: authData } = await supabaseAdmin.auth.admin.getUserById(member.id);
            if (authData.user?.email) {
                emailAddresses.push(authData.user.email);
            }
        }

        // 3. Setup Nodemailer Transporter using the user's Google App Password
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.office365.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // 4. Build the HTML Email Template
        const baseUrl = req.headers.get('host')
            ? (req.headers.get('host')?.includes('localhost') ? `http://${req.headers.get('host')}` : `https://${req.headers.get('host')}`)
            : 'https://your-domain.com';

        const startupListHtml = newSubmissions.map(sub => {
            let actualName = sub.company_name;

            // Smart fallback if the database failed to snag the exact question title
            if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
                if (sub.form_data) {
                    const keys = Object.keys(sub.form_data);
                    const nameKey = keys.find(k => {
                        const qLow = k.toLowerCase();
                        return qLow.includes('startup name') || qLow.includes('start up name') || qLow.includes('company name');
                    });

                    if (nameKey && sub.form_data[nameKey]) {
                        actualName = String(sub.form_data[nameKey]);
                    }
                }
            }

            const displayName = actualName || 'Unknown Startup';

            return `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">
                        <strong>${displayName}</strong>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
                        <a href="${baseUrl}/dashboard/submissions/${sub.id}" style="color: #4f46e5; text-decoration: none; font-weight: bold;">
                            View Application &rarr;
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        const htmlTemplate = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="margin-top: 0; color: #111;">Startup Applications Submitted</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear Team,</p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        We have received <strong>${newSubmissions.length}</strong> new startup application(s) for the upcoming Cohort Program.
                    </p>
                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Kindly review the submitted applications and share your evaluation and feedback at the earliest. Your insights will help us in shortlisting startups for the next stage.
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 32px; background: #fafafa; border-radius: 8px; overflow: hidden;">
                        ${startupListHtml}
                    </table>
                    
                    <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Please ensure timely completion of the review process.
                    </p>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${baseUrl}/dashboard" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                            Open Review Dashboard
                        </a>
                    </div>
                    
                    <br/>
                    <p style="margin: 0; color: #333; font-size: 16px;">Best regards,</p>
                    <p style="margin: 0; color: #333; font-size: 16px;"><strong>The iPreneur Portal</strong></p>
                </div>
                <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
                    This is an automated digest from your Cohort Portal.
                </p>
            </div>
        `;

        // 5. Blast the email to the entire team!
        const mailOptions = {
            from: `"Cohort Automation" <${process.env.SMTP_USER}>`,
            to: emailAddresses.join(', '), // Send ONE email using BCC or TO array
            subject: `Startup Applications Submitted – Review Required`,
            html: htmlTemplate,
        };

        await transporter.sendMail(mailOptions);

        // 6. Mark these specific applications as "Notified" so we don't email about them tomorrow
        const submissionIds = newSubmissions.map(s => s.id);
        const { error: updateError } = await supabaseAdmin
            .from('form_submissions')
            .update({ email_notified: true })
            .in('id', submissionIds);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            message: `Digest emailed to ${emailAddresses.length} team members.`,
            startupsEmailed: newSubmissions.length
        });

    } catch (error: any) {
        console.error('Email Digest Trigger Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
