import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching table:', error);
    } else {
        console.log('Columns in form_submissions:');
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('Table is empty, but query succeeded.');
        }
    }
}

checkSchema();
