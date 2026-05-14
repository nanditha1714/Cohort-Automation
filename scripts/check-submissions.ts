import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSubmissions() {
    const { data, error } = await supabase
        .from('form_submissions')
        .select('id, form_data, company_name')
        .order('created_at', { ascending: false })
        .limit(2);

    if (error) {
        console.error('Error fetching table:', error);
    } else {
        console.log('Latest Submissions:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkSubmissions();
