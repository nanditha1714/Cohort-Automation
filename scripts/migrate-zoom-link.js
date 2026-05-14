const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log("Adding zoom_link column to jury_assignments...");
    
    // We try to add it using an RPC if available, but since we don't have one,
    // we'll try to check if it exists by querying and then informing the user.
    // However, I can try to use a dummy update to see if the column exists.
    
    const { error } = await supabaseAdmin
        .from('jury_assignments')
        .select('zoom_link')
        .limit(1);

    if (error && error.message.includes('column "zoom_link" does not exist')) {
        console.log("Column 'zoom_link' does not exist. Please run this SQL in your Supabase Dashboard:");
        console.log("ALTER TABLE jury_assignments ADD COLUMN zoom_link TEXT;");
    } else if (!error) {
        console.log("Column 'zoom_link' already exists.");
    } else {
        console.error("Unexpected error:", error.message);
    }
}

runMigration();
