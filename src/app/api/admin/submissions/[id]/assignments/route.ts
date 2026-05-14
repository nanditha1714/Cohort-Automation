import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { createZoomMeeting, deleteZoomMeeting, getZoomZakToken, getZoomHostKey, getZoomAccessToken } from '@/lib/zoom';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const { data, error } = await supabaseAdmin
            .from('jury_assignments')
            .select(`
                jury_id,
                scheduled_date,
                scheduled_time,
                zoom_link,
                user_profiles (
                    id,
                    name,
                    role
                )
            `)
            .eq('submission_id', id);

        if (error) {
            console.error("GET Assignments Error:", error);
            throw error;
        }

        // Identify the requester and check permissions
        const authHeader = req.headers.get('Authorization');
        const cookieHeader = req.headers.get('cookie');
        const token = authHeader?.split(' ')[1] || cookieHeader?.split('sb-access-token=')[1]?.split(';')[0];
        
        let zakToken = null;
        let hostKey = null;
        let userEmail = null;
        let debugInfo = { tokenFound: !!token, userFound: false, roleFound: null as string | null, hasLink: false, meId: null as string | null, tier: null as string | null };

        if (token) {
            try {
                const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
                if (user) {
                    userEmail = user.email;
                    debugInfo.userFound = true;
                    const { data: profile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    const userRole = profile?.role?.toUpperCase();
                    debugInfo.roleFound = userRole;

                    if (userRole === 'ADMIN' || userRole === 'INTERNAL_TEAM' || userRole === 'JURY') {
                        const hasZoomLink = data?.some(asgn => asgn.zoom_link);
                        debugInfo.hasLink = hasZoomLink;
                        
                        if (hasZoomLink) {
                            try {
                                const zoomToken = await getZoomAccessToken();
                                const meRes = await fetch('https://api.zoom.us/v2/users/me', {
                                    headers: { 'Authorization': `Bearer ${zoomToken}` }
                                });
                                const meData = await meRes.json();
                                debugInfo.meId = meData?.id?.substring(0, 5) || 'NA';
                                debugInfo.tier = meData?.type === 1 ? 'Basic' : 'Pro';

                                const [zak, hkey] = await Promise.all([
                                    getZoomZakToken(),
                                    getZoomHostKey()
                                ]);
                                zakToken = zak;
                                hostKey = hkey;
                            } catch (zErr) {
                                console.error("Nested Zoom Debug Error:", zErr);
                            }
                        }
                    }
                }
            } catch (authErr) {
                console.error("Assignments Auth Error:", authErr);
            }
        }

        return NextResponse.json({ 
            assignments: data,
            zakToken: zakToken,
            hostKey: hostKey,
            userEmail: userEmail
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { juryIds, scheduledDate, scheduledTime } = await req.json();

        if (!Array.isArray(juryIds)) {
            return NextResponse.json({ error: 'juryIds must be an array' }, { status: 400 });
        }

        // 1. Fetch startup details for the email
        const { data: submission, error: subError } = await supabaseAdmin
            .from('form_submissions')
            .select('id, company_name, form_data')
            .eq('id', id)
            .single();

        if (subError || !submission) throw new Error('Startup not found');

        let actualName = submission.company_name;
        if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
            if (submission.form_data) {
                const keys = Object.keys(submission.form_data);
                const nameKey = keys.find(k => {
                    const qLow = k.toLowerCase();
                    return qLow.includes('startup name') || qLow.includes('start up name') || qLow.includes('company name');
                });
                if (nameKey && submission.form_data[nameKey]) {
                    actualName = String(submission.form_data[nameKey]);
                }
            }
        }
        const displayName = actualName || 'Unknown Startup';

        // 2. Delete existing assignments for this submission
        const { error: deleteError } = await supabaseAdmin
            .from('jury_assignments')
            .delete()
            .eq('submission_id', id);

        if (deleteError) throw deleteError;
        
        // 2.2 Cleanup Existing Zoom Meeting (Try to delete old one in Zoom)
        // This is the core of the 'Regeneration' logic to fix stuck sessions.
        const { data: previousAssignment } = await supabaseAdmin
            .from('jury_assignments')
            .select('zoom_link')
            .eq('submission_id', id)
            .limit(1)
            .maybeSingle();

        if (previousAssignment?.zoom_link) {
            try {
                const oldUrl = new URL(previousAssignment.zoom_link);
                const pathParts = oldUrl.pathname.split('/');
                const oldMid = pathParts[pathParts.length - 1];
                if (oldMid && /^\d+$/.test(oldMid)) {
                    await deleteZoomMeeting(oldMid);
                }
            } catch (e) {
                console.error("Cleanup old meeting failed:", e);
            }
        }

        // 2.5 Generate Zoom Meeting (if scheduled)
        let zoomLink = null;
        if (scheduledDate && scheduledTime) {
            const topic = `Jury Review: ${displayName}`;
            const startTime = `${scheduledDate}T${scheduledTime}:00`; 
            const meeting = await createZoomMeeting(topic, startTime);
            if (meeting) {
                zoomLink = meeting.join_url;
            }
        }

        // 3. Insert new ones
        if (juryIds.length > 0) {
            const inserts = juryIds.map((juryId: string) => ({
                submission_id: id,
                jury_id: juryId,
                scheduled_date: scheduledDate || null,
                scheduled_time: scheduledTime || null,
                zoom_link: zoomLink
            }));

            const { error: insertError } = await supabaseAdmin
                .from('jury_assignments')
                .insert(inserts);

            if (insertError) throw insertError;

            // 4. Trigger Emails via Nodemailer
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.office365.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            const baseUrl = req.headers.get('host')
                ? (req.headers.get('host')?.includes('localhost') ? `http://${req.headers.get('host')}` : `https://${req.headers.get('host')}`)
                : process.env.NEXT_PUBLIC_SITE_URL || 'https://cohort-automation.vercel.app';

            const startupLink = `${baseUrl}/dashboard/submissions/${id}`;

            // Fetch emails for these jury members
            const { data: juryProfiles } = await supabaseAdmin
                .from('user_profiles')
                .select('id, name')
                .in('id', juryIds);

            for (const profile of juryProfiles || []) {
                const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                const email = authUser.user?.email;

                if (email) {
                    const dateStr = scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To be shared soon';
                    const timeStr = scheduledTime || 'To be shared soon';

                    const html = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                            <div style="background-color: #4f46e5; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 22px;">Jury Pitch Session Invitation</h1>
                            </div>
                            <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                <p>Dear <strong>${profile.name}</strong>,</p>
                                <p>We are pleased to invite you to participate in the Jury Pitch Session for our Cohort Program.</p>
                                
                                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin: 25px 0;">
                                    <h3 style="margin-top: 0; color: #4f46e5; font-size: 16px;">Session Details:</h3>
                                    <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
                                    <p style="margin: 5px 0;"><strong>Time:</strong> ${timeStr}</p>
                                    ${zoomLink ? `<p style="margin: 5px 0;"><strong>Zoom Link:</strong> <a href="${zoomLink}" style="color: #4f46e5; font-weight: bold;">Join Meeting</a></p>` : '<p style="margin: 5px 0; color: #ef4444;">Zoom link will be shared shortly.</p>'}
                                </div>

                                <p>Your role will be to evaluate the assigned startups and provide feedback based on their pitch presentations.</p>
                                <p>Below are the details of the startup assigned to you:</p>
                                
                                <div style="background-color: #eef2ff; padding: 20px; border-radius: 8px; border: 1px solid #c7d2fe; text-align: center;">
                                    <p style="margin: 0 0 15px 0;"><strong>Startup:</strong> ${displayName}</p>
                                    <a href="${startupLink}" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                        View Pitch Deck & One Pager
                                    </a>
                                </div>

                                <p style="margin-top: 25px;">We look forward to your valuable insights.</p>
                                <br/>
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                            </div>
                        </div>
                    `;

                    try {
                        await transporter.sendMail({
                            from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                            to: email,
                            subject: `Jury Assignment – Cohort Pitch Session: ${displayName}`,
                            html: html
                        });
                        console.log(`Jury email sent successfully to ${email}`);
                    } catch (smtpErr: any) {
                        console.error(`Failed to send jury email to ${email}:`, smtpErr);
                    }
                }
            }

            // 5. Notify Internal Team
            try {
                const { data: teamMembers } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id, name')
                    .or('role.eq.INTERNAL_TEAM,role.eq.ADMIN');

                if (teamMembers && teamMembers.length > 0) {
                    for (const member of teamMembers) {
                        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.id);
                        const teamEmail = authUser.user?.email;

                        if (teamEmail) {
                            const dateStr = scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'To be shared';
                            const htmlTeam = `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                                    <div style="background: #1e1b4b; padding: 30px; text-align: center;">
                                        <h1 style="color: white; margin: 0; font-size: 20px;">iPreneur Internal Team Brief</h1>
                                        <p style="color: rgba(255,255,255,0.7); margin: 10px 0 0 0;">New Jury Assignment Scheduled</p>
                                    </div>
                                    <div style="padding: 30px;">
                                        <p style="font-size: 15px;">A new evaluation session has been scheduled for <strong>${displayName}</strong>.</p>
                                        
                                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Review Date</td>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${dateStr}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Review Time</td>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${scheduledTime}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Zoom Link</td>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                    ${zoomLink ? `<a href="${zoomLink}" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">Join Meeting</a>` : '<span style="color: #ef4444;">Generation failed. Please check Zoom credentials.</span>'}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #6b7280; font-size: 13px;">Jury Invited</td>
                                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px;">${juryProfiles?.map(p => p.name).join(', ')}</td>
                                            </tr>
                                        </table>

                                        <p style="font-size: 14px; color: #6b7280;">Ensure the jury has access to the pitch deck and one pager via the portal before the session starts.</p>
                                        
                                        <div style="text-align: center; margin-top: 30px;">
                                            <a href="${startupLink}" style="background: #1e1b4b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold;">
                                                Open Submission Dashboard
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `;

                            await transporter.sendMail({
                                from: `"Cohort Automation" <${process.env.SMTP_USER}>`,
                                to: teamEmail,
                                subject: `🔔 Internal Update: ${displayName} Jury Assignment`,
                                html: htmlTeam
                            });
                        }
                    }
                }
            } catch (teamErr) {
                console.error("Internal Team Notification Error:", teamErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Jury Assignment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
