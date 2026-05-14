const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    // These keys are taken from the existing run_migration.js in the workspace
    const supabaseUrl = 'https://knnwanyinjigkzospcna.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubndhbnlpbmppZ2t6b3NwY25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4NTYzNywiZXhwIjoyMDg2NzYxNjM3fQ.5UmTtMD2l3o2ssHjp4aeCVFoA0rza45BAEh9VVrVg50';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const sql = fs.readFileSync(path.join(__dirname, 'add_withdrawn_column.sql'), 'utf8');
    
    console.log('Running migration: ADD is_withdrawn COLUMN');
    
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
