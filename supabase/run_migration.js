const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const supabaseUrl = 'https://knnwanyinjigkzospcna.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubndhbnlpbmppZ2t6b3NwY25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4NTYzNywiZXhwIjoyMDg2NzYxNjM3fQ.5UmTtMD2l3o2ssHjp4aeCVFoA0rza45BAEh9VVrVg50';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const sql = fs.readFileSync(path.join(__dirname, 'add_admin_jury_decision.sql'), 'utf8');
    
    console.log('Running migration...');
    
    // Split the SQL into individual statements if necessary, but here it's simple
    // Actually, supabase-js doesn't have a direct 'execute sql' method for arbitrary SQL 
    // unless you use an RPC or a specific edge function.
    // However, I can use the PostgreSQL connection if I had the password, 
    // or I can use the 'supabase' CLI if it's configured.
    
    // Alternative: Use an RPC to run SQL if it exists. 
    // If not, I'll have to ask the user to run it in the SQL Editor.
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Migration failed:', error);
        console.log('\n--- MANUAL ACTION REQUIRED ---');
        console.log('Please copy and run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('Migration successful!');
    }
}

runMigration();
