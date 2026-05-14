require('dotenv').config({ path: '.env.local' });
if(!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    require('dotenv').config({ path: '.env' });
}

const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testMOU() {
    console.log("Fetching DueDraft.ai...");
    const { data, error } = await supabase.from('form_submissions').select('*').ilike('company_name', '%duedraft%').limit(1).single();
    
    if(error || !data) {
        console.error("Could not find DueDraft.ai in DB:", error);
        return;
    }

    const formData = data.form_data || {};
    const keys = Object.keys(formData);
    const emailKey = keys.find(k => k.toLowerCase().includes('email'));
    const startupEmail = emailKey ? String(formData[emailKey]).trim() : null;
    const founderKey = keys.find(k => k.toLowerCase().includes('founder') && !k.toLowerCase().includes('linkedin') && !k.toLowerCase().includes('background'));
    const founderName = founderKey ? formData[founderKey] : 'Founder';

    console.log(`Found DueDraft.ai! Email: ${startupEmail}, Founder: ${founderName}`);

    // Generate MOU
    const templatePath = path.join(__dirname, 'public', 'templates', 'mou_template.docx');
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const addressKey = keys.find(k => k.toLowerCase().includes('address') || k.toLowerCase().includes('location') || k.toLowerCase().includes('city'));
    const companyAddress = addressKey ? formData[addressKey] : '________________';

    doc.render({
        company_name: data.company_name,
        date: new Date().toLocaleDateString('en-GB'),
        founder: founderName,
        address: companyAddress
    });

    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Send Mail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    const toEmail = startupEmail || process.env.SMTP_USER;

    const mailOptions = {
        from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Your iPreneur Accelerator MOU - ${data.company_name}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                <h2 style="color: #4f46e5;">Welcome to the iPreneur Accelerator!</h2>
                <p>Dear ${founderName},</p>
                <p>We have successfully received your onboarding payment. Your startup, <strong>${data.company_name}</strong>, is now officially enrolled in the program.</p>
                <p>Please find attached the Memorandum of Understanding (MOU) for your reference. You may need to review, sign, and return this document to our team.</p>
                <br/>
                <p>Best regards,<br>The iPreneur Team</p>
            </div>
        `,
        attachments: [{ filename: `MOU_${data.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`, content: buf }]
    };

    console.log("Sending email to:", toEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log("Sent successfully!", info.messageId);
}

testMOU();
