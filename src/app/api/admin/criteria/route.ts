import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the Service Role Key so the API can confidently insert/fetch data 
// without relying purely on client-side JS.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: criteriaList, error } = await supabaseAdmin
            .from('evaluation_criteria')
            .select('id, criteria_text, created_at, is_active, user_profiles:created_by (name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const activeCriteria = criteriaList.find(c => c.is_active) || null;
        const history = criteriaList.filter(c => !c.is_active);

        return NextResponse.json({ activeCriteria, history });
    } catch (error: any) {
        console.error('Criteria GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { criteriaText, adminId } = body;

        if (!criteriaText || !adminId) {
            return NextResponse.json({ error: 'Missing active criteria config.' }, { status: 400 });
        }

        // Insert the new criteria as active. 
        // The postgres trigger we created will instantly set all older ones to inactive!
        const { data, error } = await supabaseAdmin
            .from('evaluation_criteria')
            .insert([{
                criteria_text: criteriaText,
                created_by: adminId,
                is_active: true
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            throw new Error(error.message || 'Database insert failed.');
        }

        return NextResponse.json({ success: true, criteria: data });
    } catch (error: any) {
        console.error('Criteria POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
