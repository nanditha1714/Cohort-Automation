const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
    console.log('Fetching withdrawn startups with is_onboarded: true...');
    const { data, error } = await supabase
        .from('form_submissions')
        .select('id, company_name')
        .eq('is_onboarded', true)
        .filter('form_data->>__is_withdrawn', 'eq', 'true');

    if (error) {
        console.error(error);
        return;
    }

    if (data.length === 0) {
        console.log('No inconsistent data found.');
        return;
    }

    console.log(`Found ${data.length} startups to fix.`);
    for (const s of data) {
        console.log(`Fixing ${s.company_name} (ID: ${s.id})...`);
        const { error: updateError } = await supabase
            .from('form_submissions')
            .update({ is_onboarded: false })
            .eq('id', s.id);
        
        if (updateError) {
            console.error(`Failed to fix ${s.company_name}:`, updateError);
        } else {
            console.log(`Successfully fixed ${s.company_name}.`);
        }
    }
}

fixData();
