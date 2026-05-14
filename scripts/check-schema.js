const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    // We can't use raw SQL easily to describe table, but we can fetch one row to see keys
    const { data, error } = await supabaseAdmin
        .from('jury_assignments')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error("Error fetching jury_assignments:", error);
    } else {
        console.log("Column names in jury_assignments:", data.length > 0 ? Object.keys(data[0]) : "Table is empty, cannot deduce columns this way.");
    }

    // Try to find users with INTERNAL_TEAM role
    const { data: team, error: teamError } = await supabaseAdmin
        .from('user_profiles')
        .select('name, role, id')
        .eq('role', 'INTERNAL_TEAM');
    
    if (teamError) {
        console.error("Error fetching internal team:", teamError);
    } else {
        console.log("Internal Team members found:", team.length);
        team.forEach(t => console.log(`- ${t.name} (${t.role})`));
    }
}

checkSchema();
