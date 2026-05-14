import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch evaluations for this submission
        const { data: evaluations, error: evalError } = await supabaseAdmin
            .from('jury_evaluations')
            .select('*')
            .eq('submission_id', id);

        if (evalError) throw evalError;

        if (!evaluations || evaluations.length === 0) {
            return NextResponse.json({ evaluations: [] });
        }

        // Fetch user profiles for names and auth.users for emails
        const juryIds = [...new Set(evaluations.map(e => e.jury_id))];
        
        // 1. Fetch names from user_profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, name')
            .in('id', juryIds);

        if (profileError) console.error('Error fetching profiles:', profileError);

        // 2. Fetch emails from auth.users (requires service role)
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) console.error('Error fetching auth users:', authError);

        // Merge profile info into evaluations
        const enrichedEvaluations = evaluations.map(evaluation => {
            const profile = profiles?.find(p => p.id === evaluation.jury_id);
            const authUser = authUsers?.users?.find(u => u.id === evaluation.jury_id);
            
            return {
                ...evaluation,
                users: { 
                    name: profile?.name || 'Expert', 
                    email: authUser?.email || 'verified@jury.panel' 
                }
            };
        });

        return NextResponse.json({ evaluations: enrichedEvaluations });
    } catch (error: any) {
        console.error('Evaluations GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { juryId, scores, notes, totalScore } = body;

        if (!juryId || !id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('jury_evaluations')
            .upsert({
                submission_id: id,
                jury_id: juryId,
                scores: scores || {},
                notes: notes || {},
                total_score: totalScore || 0,
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'submission_id, jury_id' 
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, evaluation: data });
    } catch (error: any) {
        console.error('Evaluation POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
