const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://knnwanyinjigkzospcna.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubndhbnlpbmppZ2t6b3NwY25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4NTYzNywiZXhwIjoyMDg2NzYxNjM3fQ.5UmTtMD2l3o2ssHjp4aeCVFoA0rza45BAEh9VVrVg50';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingAndEmail() {
    const { data: jobs, error } = await supabase
        .from('form_submissions')
        .select('id, company_name, form_data, startup_notified, analysis_status')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log('Latest 3 jobs:', JSON.stringify(jobs, null, 2));

    if (jobs && jobs.length > 0) {
        let job = jobs[0];
        console.log('Checking the latest job for email parameters. startup_notified:', job.startup_notified);
        let applicantEmail = '';
        if (job.form_data) {
            const keys = Object.keys(job.form_data);
            const emailKey = keys.find(k => k.toLowerCase().includes('email'));
            if (emailKey && job.form_data[emailKey]) {
                applicantEmail = String(job.form_data[emailKey]).trim();
            }
        }
        console.log('Applicant Email Extracted:', applicantEmail);

        if (!applicantEmail) {
            console.log('NO EMAIL EXTRACTED');
        } else {
            console.log('Would attempt to email:', applicantEmail);
            console.log('SMTP Config:', { user: process.env.SMTP_USER, pass: '***' });
        }
    }
}
checkPendingAndEmail();
