import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

// GET: Fetch all reviews for a specific submission
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!id || id === 'undefined') {
            return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
        }

        const { data: reviews, error } = await supabaseAdmin
            .from('startup_reviews')
            .select(`
                id,
                department,
                evaluation,
                reason,
                decision,
                created_at,
                submitter:user_profiles!reviewer_id(name)
            `)
            .eq('submission_id', id);

        if (error) {
            console.error("Supabase Error fetching reviews:", error);
            throw error;
        }

        return NextResponse.json({ reviews: reviews || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Add or update a review for a specific department
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { reviewer_id, department, evaluation, reason, decision } = body;

        if (!id || !reviewer_id || !department || (!evaluation && !reason && !decision)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Upsert the review (UNIQUE constraint on submission_id + department ensures 1 per dept)
        const { data, error } = await supabaseAdmin
            .from('startup_reviews')
            .upsert({
                submission_id: id,
                reviewer_id,
                department,
                evaluation,
                reason,
                decision
            }, {
                onConflict: 'submission_id, department'
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Error upserting review:", error);
            throw error;
        }

        return NextResponse.json({ success: true, review: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
