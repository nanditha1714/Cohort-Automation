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
        const reqBody = await req.json();
        const { content, company_name } = reqBody;

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

        // Send Email
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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
                subject: `Your iPreneur Accelerator MOU - ${company_name}`,
                text: content, 
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                        <h2 style="color: #4f46e5;">Welcome to the iPreneur Accelerator!</h2>
                        <p>Dear Founder,</p>
                        <p>We have successfully received your onboarding payment. Your startup, <strong>${company_name}</strong>, is now officially enrolled in the program.</p>
                        <p>Please find the signed <strong>Memorandum of Understanding (MOU)</strong> attached to this email for your records.</p>
                        <br/>
                        <p>Best regards,<br>The iPreneur Team</p>
                    </div>
                `,
                attachments: []
            };

            // Handle PDF or Word conversion
            if (reqBody.pdfBase64) {
                mailOptions.attachments.push({
                    filename: `MOU_${company_name.replace(/\s+/g, '_')}.pdf`,
                    content: Buffer.from(reqBody.pdfBase64, 'base64'),
                    contentType: 'application/pdf'
                });
            } else if (reqBody.docxBase64) {
                try {
                    const docxBuffer = Buffer.from(reqBody.docxBase64, 'base64');
                    const pdfBuffer = await convertDocxToPdf(docxBuffer);
                    mailOptions.attachments.push({
                        filename: `MOU_${company_name.replace(/\s+/g, '_')}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    });
                } catch (convErr) {
                    console.error("Conversion failed, falling back to sending DOCX:", convErr);
                    // Fallback to sending DOCX if conversion fails
                    mailOptions.attachments.push({
                        filename: `MOU_${company_name.replace(/\s+/g, '_')}.docx`,
                        content: Buffer.from(reqBody.docxBase64, 'base64'),
                        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                }
            }

            await transporter.sendMail(mailOptions);
        }

        // Update Database
        formData.__mou_status = 'SENT';
        formData.__mou_sent_at = new Date().toISOString();
        formData.__mou_final_text = content;

        await supabaseAdmin
            .from('form_submissions')
            .update({ 
                form_data: formData,
                is_onboarded: true 
            })
            .eq('id', id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Send MOU Text Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
