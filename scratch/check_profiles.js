const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*');
    
    if (error) {
        console.error(error);
        return;
    }

    console.log('--- USER PROFILES ---');
    data.forEach(p => {
        console.log(`- ${p.email} (${p.full_name}): Role=${p.role}, Dept=${p.department}`);
    });
}

checkProfiles();
