import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { id } = params;
        const { company_name, founder, address, date, customFile } = await req.json();

        // 1. Fetch submission to get email
        const { data: submission, error: fetchError } = await supabaseAdmin
            .from('form_submissions')
            .select('form_data')
            .eq('id', id)
            .single();

        if (fetchError || !submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        const formData = submission.form_data || {};
        const keys = Object.keys(formData);
        const emailKey = keys.find(k => k.toLowerCase().includes('email'));
        const startupEmail = emailKey ? String(formData[emailKey]).trim() : null;

        if (!startupEmail) {
            return NextResponse.json({ error: 'Startup email not found' }, { status: 400 });
        }

        let buf: Buffer;

        if (customFile) {
            // Use custom uploaded file (base64)
            buf = Buffer.from(customFile, 'base64');
        } else {
            // Generate MOU from template
            const templatePath = path.join(process.cwd(), 'public', 'templates', 'mou_template.docx');
            if (!fs.existsSync(templatePath)) {
                return NextResponse.json({ error: 'MOU template not found' }, { status: 500 });
            }

            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                // Support single braces {variable} instead of {{variable}}
                delimiters: {
                    start: '{',
                    end: '}'
                }
            });

            doc.render({
                company_name,
                founder,
                address,
                date
            });

            buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });
        }

        // 3. Send Email
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

            const mailOptions = {
                from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                to: startupEmail,
                subject: `Your iPreneur Accelerator MOU - ${company_name}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                        <h2 style="color: #4f46e5;">Welcome to the iPreneur Accelerator!</h2>
                        <p>Dear ${founder},</p>
                        <p>We have successfully received your onboarding payment. Your startup, <strong>${company_name}</strong>, is now officially enrolled in the program.</p>
                        <p>Please find attached the Memorandum of Understanding (MOU) for your reference. You may need to review, sign, and return this document to our team.</p>
                        <br/>
                        <p>Best regards,<br>The iPreneur Team</p>
                    </div>
                `,
                attachments: [
                    {
                        filename: `MOU_${company_name.toString().replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
                        content: buf
                    }
                ]
            };

            await transporter.sendMail(mailOptions);
        }

        // 4. Update Database
        formData.__mou_status = 'SENT';
        formData.__mou_sent_at = new Date().toISOString();
        formData.__mou_final_data = { company_name, founder, address, date };

        await supabaseAdmin
            .from('form_submissions')
            .update({ form_data: formData })
            .eq('id', id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Send MOU Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
