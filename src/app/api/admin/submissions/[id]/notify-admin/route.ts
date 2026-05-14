import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!id || id === 'undefined') {
            return NextResponse.json({ error: 'Invalid submission ID provided' }, { status: 400 });
        }

        // 1. Fetch startup details
        const { data: submission, error: subError } = await supabaseAdmin
            .from('form_submissions')
            .select('id, company_name, form_data')
            .eq('id', id)
            .single();

        if (subError || !submission) throw new Error('Startup not found');

        let actualName = submission.company_name;
        if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
            if (submission.form_data) {
                const keys = Object.keys(submission.form_data);
                const nameKey = keys.find(k => {
                    const qLow = k.toLowerCase();
                    return qLow.includes('startup name') || qLow.includes('start up name') || qLow.includes('company name');
                });
                if (nameKey && submission.form_data[nameKey]) {
                    actualName = String(submission.form_data[nameKey]);
                }
            }
        }
        const displayName = actualName || 'Unknown Startup';

        // 2. Fetch all Admins
        const { data: admins, error: adminError } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('role', 'ADMIN')
            .eq('status', 'ACTIVE');

        if (adminError) throw adminError;

        if (!admins || admins.length === 0) {
            return NextResponse.json({ message: 'No active Admins found to notify.' });
        }

        const adminEmails: string[] = [];
        for (const admin of admins) {
            const { data: authData } = await supabaseAdmin.auth.admin.getUserById(admin.id);
            if (authData.user?.email) {
                adminEmails.push(authData.user.email);
            }
        }

        if (adminEmails.length === 0) {
            return NextResponse.json({ message: 'No Admin email addresses found.' });
        }

        // 3. Setup Nodemailer
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

        const baseUrl = req.headers.get('host')
            ? (req.headers.get('host')?.includes('localhost') ? `http://${req.headers.get('host')}` : `https://${req.headers.get('host')}`)
            : process.env.NEXT_PUBLIC_SITE_URL || 'https://cohort-automation.vercel.app';

        const startupLink = `${baseUrl}/dashboard/submissions/${submission.id}?from=internal_review`;

        const htmlTemplate = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background: #4f46e5; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="color: white; margin: 0; font-size: 20px;">Request for Admin Review</h2>
                </div>
                <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="font-size: 16px; line-height: 1.6;">Dear Sir/Maam,</p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        During our internal review, we came across a few startup applications where we require your inputs before making a final decision.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        We request your intervention in evaluating these applications for acceptance/rejection. Details of the startup are shared below:
                    </p>
                    
                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee;">
                        <p style="margin: 0 0 10px 0;"><strong>Startup Name:</strong> ${displayName}</p>
                        <p style="margin: 0 0 20px 0;"><strong>Submission ID:</strong> ${submission.id}</p>
                        <div style="text-align: center;">
                            <a href="${startupLink}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Review Submission Now
                            </a>
                        </div>
                    </div>

                    <p style="font-size: 16px; line-height: 1.6;">Looking forward to your guidance.</p>
                    <br/>
                    <p style="margin: 0; font-size: 16px;">Best regards,</p>
                    <p style="margin: 0; font-size: 16px;"><strong>The Internal Review Team</strong></p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"Cohort Automation" <${process.env.SMTP_USER}>`,
            to: adminEmails.join(', '),
            subject: `Request for Admin Review – Startup Evaluation: ${displayName}`,
            html: htmlTemplate,
        });

        return NextResponse.json({ success: true, message: `Notification sent to ${adminEmails.length} admin(s).` });

    } catch (error: any) {
        console.error('Admin Notification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
