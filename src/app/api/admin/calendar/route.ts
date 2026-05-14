import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Fetch all assignments with joined data
        const { data: assignments, error } = await supabaseAdmin
            .from('jury_assignments')
            .select(`
                id,
                scheduled_date,
                scheduled_time,
                form_submissions (id, company_name, form_data),
                user_profiles:jury_id (id, name)
            `);

        if (error) throw error;

        // Process assignments to ensure clean startup names
        const processed = (assignments || []).map((asgn: any) => {
            const sub = asgn.form_submissions;
            let actualName = sub?.company_name;

            if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
                if (sub?.form_data) {
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
                id: asgn.id,
                date: asgn.scheduled_date,
                time: asgn.scheduled_time,
                startup_id: sub?.id,
                startup_name: actualName || 'Unknown Startup',
                jury_id: asgn.user_profiles?.id,
                jury_name: asgn.user_profiles?.name || 'Unknown Jury'
            };
        });

        return NextResponse.json({ assignments: processed });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
