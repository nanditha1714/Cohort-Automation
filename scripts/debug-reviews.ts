import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    console.log("Checking startup_reviews table...");
    const { data: reviews, error } = await supabase
        .from('startup_reviews')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Error fetching reviews:", error);
        return;
    }

    if (!reviews || reviews.length === 0) {
        console.log("No reviews found in startup_reviews table.");
        return;
    }

    console.log(`Found ${reviews.length} reviews:`);
    reviews.forEach(r => {
        console.log(`- Review ID: ${r.id}`);
        console.log(`  Submission: ${r.submission?.company_name} (${r.submission_id})`);
        console.log(`  Reviewer: ${r.reviewer?.name} (${r.reviewer_id})`);
        console.log(`  Dept: ${r.department}`);
        console.log(`  Decision: ${r.decision}`);
        console.log(`  Evaluation: ${r.evaluation?.substring(0, 50)}...`);
        console.log('---');
    });
}

debug();
