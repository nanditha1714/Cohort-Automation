
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOnboarded() {
    const { data, error } = await supabase
        .from('form_submissions')
        .select('id, company_name, is_onboarded')
        .eq('is_onboarded', true);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total Onboarded:', data.length);
    data.forEach(s => {
        console.log(`- ${s.company_name} (ID: ${s.id})`);
    });

    const { data: allData, error: allErr } = await supabase
        .from('form_submissions')
        .select('id, company_name, is_onboarded');

    console.log('\nTotal Submissions:', allData.length);
    const truthyOnboarded = allData.filter(s => s.is_onboarded);
    console.log('Truthy Onboarded Count:', truthyOnboarded.length);
}

checkOnboarded();
