import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // In Next.js 15+, dynamic params must be extracted asynchronously
        const { id } = await params;

        if (!id || id === 'undefined') {
            return NextResponse.json({ error: 'Invalid submission ID provided' }, { status: 400 });
        }

        const { data: submission, error } = await supabaseAdmin
            .from('form_submissions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Supabase Error fetching submission", error);
            throw error;
        }



        let actualName = submission.company_name;

        // Smart fallback if the database failed to snag the exact question title
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

        submission.company_name = actualName || 'Unknown Startup';

        return NextResponse.json({ submission });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    console.log("[PATCH Submissions] Request received");
    try {
        const { id } = await params;
        console.log(`[PATCH Submissions] ID: ${id}`);

        if (!id || id === 'undefined') {
            return NextResponse.json({ error: 'Invalid submission ID provided' }, { status: 400 });
        }

        const body = await req.json();
        console.log("[PATCH Submissions] Body:", JSON.stringify(body));

        // 0. CHECK TRANSITION FOR EMAIL TRIGGER
        const { data: currentSubmission } = await supabaseAdmin
            .from('form_submissions')
            .select('is_jury_accepted, is_rejected, admin_jury_decision, form_data, company_name')
            .eq('id', id)
            .single();

        let triggerTarget: 'ACCEPT' | 'REJECT' | null = null;

        if (body.is_withdrawn === true) {
            triggerTarget = 'WITHDRAW' as any;
        } else if (
            (body.is_jury_accepted === true && currentSubmission?.is_jury_accepted !== true) || 
            (body.admin_jury_decision === 'ACCEPTED' && currentSubmission?.admin_jury_decision !== 'ACCEPTED')
        ) {
            triggerTarget = 'ACCEPT';
        } else if (
            (body.is_rejected === true && currentSubmission?.is_rejected !== true) || 
            (body.admin_jury_decision === 'REJECTED' && currentSubmission?.admin_jury_decision !== 'REJECTED')
        ) {
            triggerTarget = 'REJECT';
        }
 else if (body.financial_status === 'VERIFIED' && currentSubmission?.form_data?.__financial_status !== 'VERIFIED') {
            triggerTarget = 'PAYMENT_REQUEST' as any;
        }

        // 1. PERFORM DATABASE UPDATE
        const updates: any = {};
        if (body.is_internal_reviewed !== undefined) updates.is_internal_reviewed = body.is_internal_reviewed;
        if (body.is_jury_reviewed !== undefined) updates.is_jury_reviewed = body.is_jury_reviewed;
        if (body.is_jury_accepted !== undefined) updates.is_jury_accepted = body.is_jury_accepted;
        if (body.is_rejected !== undefined) updates.is_rejected = body.is_rejected;
        if (body.needs_admin_review !== undefined) updates.needs_admin_review = body.needs_admin_review;
        if (body.is_onboarded !== undefined) updates.is_onboarded = body.is_onboarded;
        if (body.admin_jury_decision !== undefined) updates.admin_jury_decision = body.admin_jury_decision;
        
        if (body.form_data !== undefined || body.internal_review_notes !== undefined || body.internal_review_reason !== undefined || body.is_withdrawn !== undefined) {
            updates.form_data = {
                ...(currentSubmission?.form_data || {}),
                ...(body.form_data || {}),
                ...(body.internal_review_notes ? { __internal_review_notes: body.internal_review_notes } : {}),
                ...(body.internal_review_reason ? { __internal_review_reason: body.internal_review_reason } : {}),
                ...(body.is_withdrawn ? { __is_withdrawn: true } : {})
            };
        }

        if (body.financial_status !== undefined) {
            const formData = updates.form_data || currentSubmission?.form_data || {};
            formData.__financial_status = body.financial_status;
            updates.form_data = formData;
        }

        let data = null;
        let error = null;

        if (Object.keys(updates).length > 0) {
            const result = await supabaseAdmin
                .from('form_submissions')
                .update(updates)
                .eq('id', id)
                .select()
                .maybeSingle();
            
            data = result.data;
            error = result.error;

            if (error) {
                console.error("[PATCH Submissions] Supabase Update Error:", error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            if (!data) {
                console.warn(`[PATCH Submissions] No submission found with ID: ${id}`);
                return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
            }
            console.log("[PATCH Submissions] Database updated successfully");
        } else {
            console.log("[PATCH Submissions] No updates requested, fetching current data");
            const result = await supabaseAdmin
                .from('form_submissions')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            data = result.data;
            if (!data) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // 2. TRIGGER EMAIL NOTIFICATION IF NEEDED
        if (triggerTarget && data) {
            try {
                if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                    console.warn("[Email Trigger] SMTP credentials missing in .env. Skipping email.");
                    return NextResponse.json({ success: true, submission: data, message: "DB updated but SMTP credentials missing" });
                }

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

                // Find Startup Email
                const formData = data.form_data || {};
                const keys = Object.keys(formData);
                const emailKey = keys.find(k => {
                    const lowK = k.toLowerCase();
                    return (lowK.includes('email') || lowK.includes('e-mail')) && !lowK.includes('founder') && !lowK.includes('co-founder');
                }) || keys.find(k => k.toLowerCase().includes('email'));
                
                const startupEmail = emailKey ? String(formData[emailKey]).trim() : null;
                console.log(`[Email Trigger] Target: ${triggerTarget}, Startup: ${data.company_name}, Found Email: ${startupEmail}`);

                if (startupEmail) {
                    let subject = "";
                    let html = "";

                    if (triggerTarget === 'ACCEPT') {
                        const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSeUNpix5oJkPK7gZ-K1mhWCkYWCL_sxTx5c3-Y4YZbi-pWkOQ/viewform?usp=pp_url&entry.370861054=${data.id}`;
                        subject = `Congratulations – Next Steps for Cohort Selection - ${data.company_name}`;
                        html = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                <div style="background-color: #4f46e5; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations!</h1>
                                </div>
                                <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                    <p>Dear <strong>${data.company_name}</strong>,</p>
                                    <p><strong>Congratulations!</strong></p>
                                    <p>We are delighted to inform you that your startup has been selected for the next stage of our Cohort Program.</p>
                                    <p>As part of the process, we request you to submit your financial details for further evaluation. Please fill out the form using the link below:</p>
                                    
                                    <div style="margin: 35px 0; text-align: center;">
                                        <a href="${formUrl}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                            Submit Financial Details
                                        </a>
                                    </div>
                                    
                                    <p>Kindly complete the submission within <strong>48 hours</strong>.</p>
                                    <p>Looking forward to your response.</p>
                                    <br/>
                                    <p style="margin: 0;">Best regards,</p>
                                    <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                                    
                                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                                    <p style="font-size: 12px; color: #9ca3af;">Direct Link: ${formUrl}</p>
                                </div>
                            </div>
                        `;
                    } else if (triggerTarget === ('PAYMENT_REQUEST' as any)) {
                        const host = req.headers.get('host') || 'cohort-ipreneur.vercel.app';
                        const protocol = host.includes('localhost') ? 'http' : 'https';
                        const paymentLink = `${protocol}://${host}/public/payment/${data.id}`;
                        
                        subject = `Financial Evaluation Completed – Proceed with Payment - ${data.company_name}`;
                        html = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                <div style="background-color: #4f46e5; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 22px;">Financial Evaluation Completed</h1>
                                </div>
                                <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                    <p>Dear <strong>${data.company_name}</strong>,</p>
                                    <p>We are pleased to inform you that your financial evaluation has been successfully completed.</p>
                                    <p>You may now proceed with the payment using the link below to confirm your participation in the cohort:</p>
                                    
                                    <div style="margin: 35px 0; text-align: center;">
                                        <a href="${paymentLink}" style="background-color: #4f46e5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                            Proceed to Payment
                                        </a>
                                    </div>
                                    
                                    <p>Kindly complete the payment within <strong>48 hours</strong> to confirm your participation.</p>
                                    <br/>
                                    <p style="margin: 0;">Best regards,</p>
                                    <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                                    
                                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                                    <p style="font-size: 12px; color: #9ca3af;">Direct Link: ${paymentLink}</p>
                                </div>
                            </div>
                        `;
                    } else if (triggerTarget === ('WITHDRAW' as any)) {
                        subject = `Withdrawal Confirmation - ${data.company_name}`;
                        html = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                <div style="background-color: #ef4444; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; color: white;">
                                    <h1 style="margin: 0; font-size: 24px;">Withdrawal Confirmed</h1>
                                </div>
                                <div style="padding: 30px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                                    <p style="font-size: 16px;">Hello Team <strong>${data.company_name}</strong>,</p>
                                    <p>As per your request or our recent administrative update, your application for the cohort has been officially withdrawn.</p>
                                    <p>Please find the attached formal withdrawal confirmation for your records.</p>
                                    <p style="margin-top: 25px;">We wish you the best in your future endeavors.</p>
                                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                                    <p style="font-size: 14px; color: #6b7280;">Best regards,<br><strong>The iPreneur Team</strong></p>
                                </div>
                            </div>
                        `;
                    } else {
                        const isPostJury = formData.__is_jury_evaluated === true;
                        const isFinancialStage = formData.__financial_status === 'RECEIVED' || formData.__financial_status === 'REJECTED' || formData.__financial_status === 'UNDER_REVIEW';

                        if (isFinancialStage) {
                            subject = `Update on Financial Evaluation - ${data.company_name}`;
                            html = `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                    <div style="background-color: #374151; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: white; margin: 0; font-size: 20px;">Financial Evaluation Update</h1>
                                    </div>
                                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                        <p>Dear <strong>${data.company_name}</strong>,</p>
                                        <p>Thank you for submitting your financial details.</p>
                                        <p>After careful review, we regret to inform you that we are unable to proceed further with your application at this stage.</p>
                                        <p>We appreciate your interest and wish you success in your journey ahead.</p>
                                        <br/>
                                        <p style="margin: 0;">Warm regards,</p>
                                        <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                                    </div>
                                </div>
                            `;
                        } else if (isPostJury) {
                            subject = `Update on Your Cohort Application - ${data.company_name}`;
                            html = `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                    <div style="background-color: #374151; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: white; margin: 0; font-size: 20px;">Application Update</h1>
                                    </div>
                                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                        <p>Dear <strong>${data.company_name}</strong>,</p>
                                        <p>Thank you for participating in the Jury Pitch Session.</p>
                                        <p>After careful consideration, we regret to inform you that your startup has not been selected for this cohort.</p>
                                        <p>We truly appreciate your time and effort in presenting your venture to our panel.</p>
                                        <p>We wish you continued success and encourage you to stay in touch for future opportunities.</p>
                                        <br/>
                                        <p style="margin: 0;">Warm regards,</p>
                                        <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                                    </div>
                                </div>
                            `;
                        } else {
                            subject = `Regarding Your Cohort Application - ${data.company_name}`;
                            html = `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                                    <div style="background-color: #374151; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                                        <h1 style="color: white; margin: 0; font-size: 20px;">Application Update</h1>
                                    </div>
                                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                                        <p>Dear <strong>${data.company_name}</strong>,</p>
                                        <p>Thank you for applying to our Cohort Program.</p>
                                        <p>After careful evaluation, we regret to inform you that your application has not been selected for this cohort.</p>
                                        <p>We received a large number of strong applications, and the selection process was highly competitive. We truly appreciate the effort you put into your application.</p>
                                        <p>We encourage you to stay connected with us and apply for future cohorts.</p>
                                        <p>Wishing you continued success in your journey.</p>
                                        <br/>
                                        <p style="margin: 0;">Warm regards,</p>
                                        <p style="margin: 0;"><strong>The iPreneur Team</strong></p>
                                    </div>
                                </div>
                            `;
                        }
                    }

                    const mailOptions: any = {
                        from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                        to: startupEmail,
                        subject: subject,
                        html: html
                    };

                    // Add attachment for withdrawal
                    if (triggerTarget === ('WITHDRAW' as any)) {
                        try {
                            const templatePath = path.join(process.cwd(), 'public', 'templates', 'withdraw_notice.docx');
                            if (fs.existsSync(templatePath)) {
                                const content = fs.readFileSync(templatePath, 'binary');
                                const zip = new PizZip(content);
                                const doc = new Docxtemplater(zip, {
                                    paragraphLoop: true,
                                    linebreaks: true,
                                    delimiters: { start: '{', end: '}' }
                                });

                                // Find founder name from form data
                                const founderNameKey = Object.keys(data.form_data || {}).find(k => k.toLowerCase().includes('founder') && !k.toLowerCase().includes('email')) || 'Founder';
                                const founderName = data.form_data[founderNameKey] || 'Founder';

                                doc.render({
                                    company_name: data.company_name,
                                    founder: founderName,
                                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                });

                                const buf = doc.getZip().generate({
                                    type: 'nodebuffer',
                                    compression: 'DEFLATE',
                                });

                                mailOptions.attachments = [
                                    {
                                        filename: `Withdrawal_Confirmation_${data.company_name.toString().replace(/[^a-zA-Z0-9]/g, '_')}.docx`,
                                        content: buf
                                    }
                                ];
                            } else {
                                console.warn("[Email Trigger] Withdrawal template NOT found at", templatePath);
                            }
                        } catch (docErr) {
                            console.error("Error generating withdrawal document:", docErr);
                        }
                    }

                    await transporter.sendMail(mailOptions);

                    console.log(`${triggerTarget} email sent successfully to ${startupEmail}`);
                }
            } catch (emailErr: any) {
                console.error("Email notification failed:", emailErr);
                return NextResponse.json({ success: true, submission: data, email_error: emailErr.message });
            }
        }

        return NextResponse.json({ success: true, submission: data });
    } catch (error: any) {
        console.error("[PATCH Submissions] CRITICAL ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

}
