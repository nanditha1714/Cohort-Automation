const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkZoomLinks() {
    console.log("Checking jury_assignments for zoom_link column...");
    const { data, error } = await supabaseAdmin
        .from('jury_assignments')
        .select('*')
        .limit(5);

    if (error) {
        console.error("Error fetching assignments:", error.message);
        if (error.message.includes('column "zoom_link" does not exist')) {
            console.log("\n❌ CRITICAL: The 'zoom_link' column is MISSING.");
            console.log("Please run this SQL in Supabase:");
            console.log("ALTER TABLE jury_assignments ADD COLUMN zoom_link TEXT;");
        }
    } else {
        console.log("Found", data.length, "assignments.");
        data.forEach(asgn => {
            console.log(`- ID: ${asgn.id}, Startup ID: ${asgn.submission_id}, Zoom Link: ${asgn.zoom_link || 'NULL'}`);
        });
    }
}

checkZoomLinks();
