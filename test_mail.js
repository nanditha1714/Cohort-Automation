const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMail() {
    try {
        console.log('Testing SMTP for:', process.env.SMTP_USER);
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
            to: process.env.SMTP_USER,
            subject: `SMTP Connection Test`,
            html: `<p>SMTP Connection successful using settings from your .env file.</p>`,
        };
        
        console.log('Sending test mail...');
        let info = await transporter.sendMail(mailOptions);
        console.log('Success! Message ID:', info.messageId);
    } catch (e) {
        console.error('SMTP Error:', e);
    }
}
testMail();
