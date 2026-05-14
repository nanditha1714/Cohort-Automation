const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubmissions() {
    const { data, error } = await supabase
        .from('form_submissions')
        .select('id, company_name, is_jury_accepted, admin_jury_decision, is_onboarded, is_rejected, form_data');
    
    if (error) {
        console.error(error);
        return;
    }

    console.log('--- ALL SUBMISSIONS ---');
    data.forEach(s => {
        console.log(`- ${s.company_name}: 
          Jury Accepted: ${s.is_jury_accepted}
          Admin Decision: ${s.admin_jury_decision}
          Onboarded: ${s.is_onboarded}
          Rejected: ${s.is_rejected}
          Withdrawn: ${s.form_data?.__is_withdrawn}
        `);
    });
}

checkSubmissions();
