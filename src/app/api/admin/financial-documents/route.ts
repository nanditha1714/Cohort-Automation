import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const submissionId = searchParams.get('id');

        if (!submissionId) {
            console.error('[API] Missing submissionId parameter');
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
        }

        console.log(`[API] Fetching financial documents for ID: ${submissionId}`);

        const { data, error } = await supabaseAdmin
            .from('financial_documents')
            .select('*')
            .eq('submission_id', submissionId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[API] Supabase Error: ${error.message}`);
            throw error;
        }

        console.log(`[API] Found ${data?.length || 0} documents for ID: ${submissionId}`);

        // For each document, if it has paths in form_response_data, we'll need to generate signed URLs later in the UI
        // or we can generate them here. For now, just return the raw data.
        return NextResponse.json({ documents: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
