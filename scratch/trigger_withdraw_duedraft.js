
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerWithdrawal() {
    console.log('Searching for DueDraft...');
    
    const { data: submissions, error } = await supabase
        .from('form_submissions')
        .select('id, company_name, form_data')
        .or('company_name.ilike.%duedraft%,form_data->>Startup Name.ilike.%duedraft%');

    if (error) {
        console.error('Error fetching submissions:', error);
        return;
    }

    if (!submissions || submissions.length === 0) {
        console.log('No submission found for DueDraft.');
        return;
    }

    const sub = submissions[0];
    console.log(`Found submission: ${sub.company_name} (ID: ${sub.id})`);

    // Manually trigger the withdrawal API logic by calling the endpoint or simulating the PATCH
    // Since I want to test the full email flow, I'll use fetch to the local API if possible, 
    // but here it's easier to just run a script that does what the API does.
    
    // Better: I'll just tell the user to click the button again now that it's fixed.
    // BUT the user specifically asked ME to send it.
    
    // Fallback: Direct email sending logic
    console.log('Sending withdrawal email directly via SMTP...');
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const formData = sub.form_data || {};
        const keys = Object.keys(formData);
        const emailKey = keys.find(k => {
            const lowK = k.toLowerCase();
            return (lowK.includes('email') || lowK.includes('e-mail')) && !lowK.includes('founder') && !lowK.includes('co-founder');
        }) || keys.find(k => k.toLowerCase().includes('email'));
        
        const startupEmail = emailKey ? String(formData[emailKey]).trim() : null;
        if (!startupEmail) throw new Error('Startup email not found in form data');

        const templatePath = path.join(process.cwd(), 'public', 'templates', 'withdraw_notice.docx');
        let attachments = [];

        if (fs.existsSync(templatePath)) {
            const content = fs.readFileSync(templatePath, 'binary');
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{', end: '}' }
            });

            const founderNameKey = Object.keys(formData).find(k => k.toLowerCase().includes('founder') && !k.toLowerCase().includes('email')) || 'Founder';
            const founderName = formData[founderNameKey] || 'Founder';

            doc.render({
                company_name: sub.company_name,
                founder: founderName,
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            });

            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            attachments = [
                {
                    filename: `Withdrawal_Confirmation_${sub.company_name.toString().replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
                    content: buf
                }
            ];
            console.log('Generated Word attachment.');
        } else {
            console.warn('Template not found at', templatePath, '- sending email without attachment');
        }

        await transporter.sendMail({
            from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
            to: startupEmail,
            subject: `Withdrawal Confirmation - ${sub.company_name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                    <div style="background-color: #ef4444; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">Withdrawal Confirmed</h1>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                        <p style="font-size: 16px;">Hello Team <strong>${sub.company_name}</strong>,</p>
                        <p>As per your request or our recent administrative update, your application for the cohort has been officially withdrawn.</p>
                        <p>Please find the attached formal withdrawal confirmation for your records.</p>
                        <p style="margin-top: 25px;">We wish you the best in your future endeavors.</p>
                        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                        <p style="font-size: 14px; color: #6b7280;">Best regards,<br><strong>The iPreneur Team</strong></p>
                    </div>
                </div>
            `,
            attachments
        });

        console.log('Successfully sent withdrawal email to:', startupEmail);

        // Also update database to reflect withdrawn status
        await supabase
            .from('form_submissions')
            .update({ 
                is_onboarded: false, 
                is_rejected: true,
                form_data: { ...formData, __withdrawal_sent_at: new Date().toISOString() }
            })
            .eq('id', sub.id);
        console.log('Database updated.');

    } catch (err) {
        console.error('Failed to send email:', err.message);
    }
}

triggerWithdrawal();
