import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { convertDocxToPdf } from '@/lib/document-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { id } = params;
        const { pdfBase64, docxBase64, company_name } = await req.json();

        // 1. Fetch the submission data to get the email (Same logic as other triggers)
        const { data: sub, error: subError } = await supabaseAdmin
            .from('form_submissions')
            .select('form_data')
            .eq('id', id)
            .single();

        if (subError || !sub) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const formData = sub.form_data || {};
        const keys = Object.keys(formData);
        const emailKey = keys.find(k => {
            const lowK = k.toLowerCase();
            return (lowK.includes('email') || lowK.includes('e-mail')) && !lowK.includes('founder') && !lowK.includes('co-founder');
        }) || keys.find(k => k.toLowerCase().includes('email'));
        
        const startupEmail = emailKey ? String(formData[emailKey]).trim() : null;

        if (!startupEmail) {
            return NextResponse.json({ error: 'Could not find a valid startup email in the form data.' }, { status: 400 });
        }

        // 1. Send Email with PDF
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log(`[Withdrawal] Attempting to send email to ${startupEmail} via ${process.env.SMTP_HOST || 'smtp.office365.com'}`);
            
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

            const mailOptions: any = {
                from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                to: startupEmail,
                subject: `Official Withdrawal Notice - ${company_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                        <div style="background-color: #ef4444; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">Withdrawal Confirmed</h1>
                        </div>
                        <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                            <p style="font-size: 16px;">Dear Team <strong>${company_name}</strong>,</p>
                            <p>This email serves as formal confirmation that your application for the cohort has been officially withdrawn.</p>
                            <p>Please find the signed <strong>Withdrawal Notice</strong> attached to this email for your records.</p>
                            <p style="margin-top: 25px;">We wish you the best in your future endeavors.</p>
                            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                            <p style="font-size: 14px; color: #6b7280;">Best regards,<br><strong>The iPreneur Team</strong></p>
                        </div>
                    </div>
                `,
                attachments: []
            };

            // Handle PDF or Word conversion
            if (pdfBase64) {
                console.log('[Withdrawal] Attaching PDF from base64');
                mailOptions.attachments.push({
                    filename: `Withdrawal_Notice_${company_name.replace(/\s+/g, '_')}.pdf`,
                    content: Buffer.from(pdfBase64, 'base64'),
                    contentType: 'application/pdf'
                });
            } else if (docxBase64) {
                console.log('[Withdrawal] Attempting DOCX to PDF conversion');
                try {
                    const docxBuffer = Buffer.from(docxBase64, 'base64');
                    const pdfBuffer = await convertDocxToPdf(docxBuffer);
                    mailOptions.attachments.push({
                        filename: `Withdrawal_Notice_${company_name.replace(/\s+/g, '_')}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    });
                    console.log('[Withdrawal] Conversion successful');
                } catch (convErr) {
                    console.warn("[Withdrawal] Conversion failed, falling back to sending DOCX:", convErr);
                    mailOptions.attachments.push({
                        filename: `Withdrawal_Notice_${company_name.replace(/\s+/g, '_')}.docx`,
                        content: Buffer.from(docxBase64, 'base64'),
                        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                }
            }
            
            try {
                await transporter.sendMail(mailOptions);
                console.log('[Withdrawal] Email sent successfully');
            } catch (smtpErr: any) {
                console.error('[Withdrawal] SMTP Error:', smtpErr);
                throw new Error(`Email sending failed: ${smtpErr.message}`);
            }
        }

        // 2. Update Database
        console.log(`[Withdrawal] Updating database for ID: ${id}`);
        formData.__is_withdrawn = true;
        formData.__withdrawal_sent_at = new Date().toISOString();

        const { error: dbError } = await supabaseAdmin
            .from('form_submissions')
            .update({ 
                is_onboarded: false,
                is_withdrawn: true,
                form_data: formData 
            })
            .eq('id', id);

        if (dbError) {
            console.error('[Withdrawal] Database Update Error:', dbError);
            throw new Error(`Database update failed: ${dbError.message}`);
        }

        console.log('[Withdrawal] Withdrawal processed successfully');
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Withdrawal] Fatal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
