import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase with the Service Role Key to bypass RLS for incoming webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// You should set this in your .env file:
// GOOGLE_FORM_WEBHOOK_SECRET=your_super_secret_string
// The Apps Script must send this header to prove it is allowed to add data.
const WEBHOOK_SECRET = process.env.GOOGLE_FORM_WEBHOOK_SECRET || 'dev_secret_123';

export async function POST(req: Request) {
    try {
        // 1. Validate Secret Header for Security
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized webhook access' }, { status: 401 });
        }

        // 2. Parse the Incoming JSON payload from Google Apps Script
        const body = await req.json();
        const { fileUrl, ...formData } = body;

        // --- NEW: Check if this is a Financial Verification submission ---
        // The financial form link includes entry.545571410 as the submission ID.
        // Google Forms sends field names as keys. We check for common submission ID keys.
        const keys = Object.keys(formData);
        const submissionIdKey = keys.find(k => 
            k.toLowerCase().includes('submission id') || 
            k.toLowerCase().includes('startup id') || 
            k.toLowerCase().includes('entry.370861054') || 
            k.toLowerCase().includes('entry.545571410') || 
            k.toLowerCase().includes('submissionid')
        );
        const submissionId = submissionIdKey ? String(formData[submissionIdKey]).trim() : null;

        if (submissionId && submissionId.length > 20) { // Simple check for UUID-like string
            console.log(`[Webhook] Financial documents received for submission: ${submissionId}`);
            
            // 1. Fetch startup info
            const { data: startup } = await supabase
                .from('form_submissions')
                .select('company_name, form_data')
                .eq('id', submissionId)
                .single();

            const startupName = startup?.company_name || 'Unknown Startup';

            // 2. Insert into financial_documents
            const { error: finError } = await supabase
                .from('financial_documents')
                .insert([{
                    submission_id: submissionId,
                    form_response_data: formData,
                    file_url: fileUrl || null
                }]);

            if (finError) {
                console.error('Financial Insert Error:', finError);
                return NextResponse.json({ error: 'Failed to save financial documents' }, { status: 500 });
            }

            // 3. Update submission status
            const updatedFormData = { ...(startup?.form_data || {}), __financial_status: 'RECEIVED' };
            await supabase
                .from('form_submissions')
                .update({ form_data: updatedFormData })
                .eq('id', submissionId);

            // 4. Notify Investment Team & Admins
            try {
                const { data: teamMembers } = await supabase
                    .from('user_profiles')
                    .select('id, name, role, department')
                    .or('role.eq.ADMIN,department.ilike.INVESTMENT%')
                    .eq('status', 'ACTIVE');

                const teamEmails: string[] = [];
                for (const member of teamMembers || []) {
                    const { data: authUser } = await supabase.auth.admin.getUserById(member.id);
                    if (authUser.user?.email) teamEmails.push(authUser.user.email);
                }

                if (teamEmails.length > 0) {
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.office365.com',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: process.env.SMTP_SECURE === 'true', 
                        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    const baseUrl = req.headers.get('host')
                        ? (req.headers.get('host')?.includes('localhost') ? `http://${req.headers.get('host')}` : `https://${req.headers.get('host')}`)
                        : process.env.NEXT_PUBLIC_SITE_URL || 'https://cohort-automation.vercel.app';

                    const reviewLink = `${baseUrl}/dashboard/submissions/${submissionId}?tab=financials`;

                    await transporter.sendMail({
                        from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                        to: teamEmails.join(', '),
                        subject: `Financial Details Received – Review Required: ${startupName}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                <div style="background-color: #4f46e5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 20px;">Financials Received</h1>
                                </div>
                                <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                    <p>Dear Investment Team,</p>
                                    <p>We have received financial details from the following startup for evaluation:</p>
                                    
                                    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #eee;">
                                        <p style="margin: 0;"><strong>Startup Name:</strong> ${startupName}</p>
                                        <p style="margin: 5px 0 20px 0;"><strong>Submission ID:</strong> ${submissionId}</p>
                                        <div style="text-align: center;">
                                            <a href="${reviewLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                                Review Financials Now
                                            </a>
                                        </div>
                                    </div>

                                    <p>Kindly review the submitted information and share your assessment.</p>
                                    <br/>
                                    <p style="margin: 0;">Best regards,</p>
                                    <p style="margin: 0;"><strong>The iPreneur Portal</strong></p>
                                </div>
                            </div>
                        `,
                    });
                }
            } catch (err) {
                console.error('Failed to notify investment team:', err);
            }

            return NextResponse.json({ success: true, type: 'financials', submissionId });
        }

        // --- ORIGINAL: Handle New Application Submission ---
        // Try to extract the startup name and email from the form fields
        let detectedName = 'Unknown Startup';
        let applicantEmail = '';
        
        const nameKey = keys.find(k => k.toLowerCase().includes('startup name') || k.toLowerCase().includes('company name'));
        if (nameKey && formData[nameKey]) {
            detectedName = String(formData[nameKey]);
        }
        
        const emailKey = keys.find(k => k.toLowerCase().includes('email'));
        if (emailKey && formData[emailKey]) {
            applicantEmail = String(formData[emailKey]).trim();
        }

        // 3. Send Thank You Email
        let emailSuccess = false;
        if (applicantEmail) {
            try {
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
                
                const mailOptions = {
                    from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                    to: applicantEmail,
                    subject: `Thank You for Applying to Our Cohort Program - ${detectedName}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                            <div style="background-color: #4f46e5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 20px;">Application Received</h1>
                            </div>
                            <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                <p>Dear <strong>${detectedName}</strong>,</p>
                                <p>Thank you for submitting your application for our upcoming Cohort Program.</p>
                                <p>We appreciate your interest in being a part of our ecosystem. Your application has been successfully received and is currently under review by our team.</p>
                                <p>We will keep you informed about the next steps in the evaluation process. In the meantime, if you have any questions, feel free to reach out.</p>
                                <p>Wishing you the very best in your startup journey.</p>
                                <br/>
                                <p style="margin: 0;">Warm regards,</p>
                                <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                            </div>
                        </div>
                    `,
                };
                
                await transporter.sendMail(mailOptions);
                emailSuccess = true;
            } catch (err) {
                console.error('Failed to send thank you email:', err);
            }
        }
        
        // 4. Insert into Supabase
        const { data, error } = await supabase
            .from('form_submissions')
            .insert([
                {
                    company_name: detectedName,
                    form_data: formData,
                    file_url: fileUrl || null,
                    startup_notified: emailSuccess
                }
            ])
            .select();

        if (error) {
            console.error('Supabase Insert Error:', error.message);
            return NextResponse.json({ error: 'Failed to insert into database' }, { status: 500 });
        }

        // 5. Trigger the AI Analysis Queue asynchronously
        const baseUrl = req.headers.get('host') ? (req.headers.get('host')?.includes('localhost') ? `http://${req.headers.get('host')}` : `https://${req.headers.get('host')}`) : 'http://localhost:3000';
        fetch(`${baseUrl}/api/cron/process-queue`).catch(err => {
            console.error('Failed to trigger background AI processing:', err);
        });

        return NextResponse.json({ success: true, insertedId: data[0].id, type: 'application' });

    } catch (error: any) {
        console.error('Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

