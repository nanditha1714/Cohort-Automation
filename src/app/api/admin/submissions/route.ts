import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const onboardedOnly = searchParams.get('onboarded') === 'true';

        let query = supabaseAdmin
            .from('form_submissions')
            .select('id, company_name, analysis_status, created_at, form_data, is_internal_reviewed, is_jury_reviewed, is_jury_accepted, is_rejected, is_payment_completed, is_onboarded, needs_admin_review, admin_jury_decision, startup_reviews(department), jury_assignments(jury_id), jury_evaluations(total_score), financial_documents(form_response_data)');

        if (onboardedOnly) {
            // Show both successfully onboarded AND withdrawn startups in this view
            query = query.or('is_onboarded.eq.true,form_data->>__is_withdrawn.eq.true');
        }

        const { data: rawSubmissions, error } = await query
            .order('created_at', { ascending: false });

        if (error) throw error;

        const submissions = rawSubmissions.map((sub) => {
            let actualName = sub.company_name;

            // Smart fallback: If Google Apps Script failed to capture it, extract it on the fly
            if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
                if (sub.form_data) {
                    const keys = Object.keys(sub.form_data);
                    const nameKey = keys.find(k => {
                        const qLow = k.toLowerCase();
                        return qLow.includes('startup name') || qLow.includes('start up name') || qLow.includes('company name');
                    });

                    if (nameKey && sub.form_data[nameKey]) {
                        actualName = String(sub.form_data[nameKey]);
                    }
                }
            }

            return {
                id: sub.id,
                company_name: actualName || 'Unknown Startup',
                analysis_status: sub.analysis_status,
                created_at: sub.created_at,
                is_internal_reviewed: sub.is_internal_reviewed || false,
                is_jury_reviewed: sub.is_jury_reviewed || false,
                is_jury_accepted: sub.is_jury_accepted,
                is_rejected: sub.is_rejected || false,
                is_payment_completed: sub.is_payment_completed || false,
                is_onboarded: sub.is_onboarded || false,
                needs_admin_review: sub.needs_admin_review || false,
                financial_status: sub.form_data?.__financial_status || null,
                payment_status: sub.form_data?.__payment_status || (sub.is_payment_completed ? 'PAID' : 'PENDING'),
                razorpay_order_id: sub.form_data?.__razorpay_order_id || null,
                financial_docs: sub.financial_documents?.[0]?.form_response_data || null,
                review_count: sub.startup_reviews?.length || 0,
                departments_reviewed: sub.startup_reviews?.map((r: any) => r.department) || [],
                assigned_jury_ids: sub.jury_assignments?.map((a: any) => a.jury_id) || [],
                jury_scores: sub.jury_evaluations?.map((e: any) => e.total_score) || [],
                admin_jury_decision: sub.admin_jury_decision || null,
                is_withdrawn: sub.form_data?.__is_withdrawn || false,
                onboarded_at: sub.form_data?.__mou_sent_at || sub.created_at
            };
        });

        return NextResponse.json({ submissions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
