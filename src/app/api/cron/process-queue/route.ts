import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseOffice } from 'officeparser';
import JSZip from 'jszip';
import nodemailer from 'nodemailer';

// Vercel / Next.js max duration (seconds) - Gemini is very fast, 5 minutes is plenty.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function GET(req: Request) {
    let lockedJobId: string | null = null;
    try {
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Missing GEMINI_API_KEY in .env' }, { status: 500 });
        }

        console.log('--- Checking for Welcome Email Retries ---');
        // 0. Retry any Welcome Emails that failed (even if they are COMPLETED)
        const { data: unnotifiedJobs } = await supabaseAdmin
            .from('form_submissions')
            .select('id, company_name, form_data')
            .eq('startup_notified', false)
            .limit(3);

        if (unnotifiedJobs && unnotifiedJobs.length > 0) {
            for (const failedJob of unnotifiedJobs) {
                console.log(`Job ${failedJob.id} was not notified. Attempting to resend welcome email...`);
                let applicantEmail = '';
                if (failedJob.form_data) {
                    const keys = Object.keys(failedJob.form_data);
                    const emailKey = keys.find(k => k.toLowerCase().includes('email'));
                    if (emailKey && failedJob.form_data[emailKey]) {
                        applicantEmail = String(failedJob.form_data[emailKey]).trim();
                    }
                }

                if (applicantEmail) {
                    try {
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
                        
                        const mailOptions = {
                            from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                            to: applicantEmail,
                            subject: `Application Received - ${failedJob.company_name}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                    <h2 style="color: #4f46e5;">Thank you for your submission!</h2>
                                    <p>We have successfully received your application for <strong>${failedJob.company_name || 'your startup'}</strong>.</p>
                                    <p>Our internal team and AI systems are currently reviewing your pitch deck and data. We will get back to you soon with the next steps.</p>
                                    <br/>
                                    <p>Best regards,<br>The iPreneur Team</p>
                                </div>
                            `,
                        };
                        
                        await transporter.sendMail(mailOptions);
                        
                        // Mark as successfully notified
                        await supabaseAdmin
                            .from('form_submissions')
                            .update({ startup_notified: true })
                            .eq('id', failedJob.id);
                            
                        console.log(`Successfully sent recovery email to ${applicantEmail}`);
                    } catch (err) {
                        console.error('Failed to send recovery email:', err);
                    }
                } else {
                    // Mark as true so it skips it next time, since there's no email to send to
                    await supabaseAdmin
                        .from('form_submissions')
                        .update({ startup_notified: true })
                        .eq('id', failedJob.id);
                }
            }
        }
        console.log('--- Finished Welcome Email Retries ---');

        // 1. Fetch the oldest PENDING submission
        const { data: pendingJobs, error: fetchError } = await supabaseAdmin
            .from('form_submissions')
            .select('id, form_data, file_url, company_name, startup_notified')
            .eq('analysis_status', 'PENDING')
            .order('created_at', { ascending: true })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!pendingJobs || pendingJobs.length === 0) {
            return NextResponse.json({ message: 'No pending jobs in queue.' });
        }

        const job = pendingJobs[0];
        lockedJobId = job.id;

        let actualName = job.company_name;

        // Smart fallback: If Google Apps Script failed to capture it, extract it on the fly
        if (!actualName || actualName === 'Unknown Startup' || actualName === '') {
            if (job.form_data) {
                const keys = Object.keys(job.form_data);
                const nameKey = keys.find(k => {
                    const qLow = k.toLowerCase();
                    return qLow.includes('startup name') || qLow.includes('start up name') || qLow.includes('company name');
                });

                if (nameKey && job.form_data[nameKey]) {
                    actualName = String(job.form_data[nameKey]);
                }
            }
        }

        job.company_name = actualName || 'Unknown Startup';

        // 1.5. Retry sending welcome email if it failed during webhook
        let finalNotifiedStatus = job.startup_notified;
        if (job.startup_notified === false) {
            console.log(`Job ${job.id} was not notified. Attempting to resend welcome email...`);
            
            let applicantEmail = '';
            if (job.form_data) {
                const keys = Object.keys(job.form_data);
                const emailKey = keys.find(k => k.toLowerCase().includes('email'));
                if (emailKey && job.form_data[emailKey]) {
                    applicantEmail = String(job.form_data[emailKey]).trim();
                }
            }

            if (applicantEmail) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.office365.com',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS,
                        },
                    });
                    
                    const mailOptions = {
                        from: `"iPreneur Cohort" <${process.env.SMTP_USER}>`,
                        to: applicantEmail,
                        subject: `Application Received - ${job.company_name}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                <h2 style="color: #4f46e5;">Thank you for your submission!</h2>
                                <p>We have successfully received your application for <strong>${job.company_name}</strong>.</p>
                                <p>Our internal team and AI systems are currently reviewing your pitch deck and data. We will get back to you soon with the next steps.</p>
                                <br/>
                                <p>Best regards,<br>The iPreneur Team</p>
                            </div>
                        `,
                    };
                    
                    await transporter.sendMail(mailOptions);
                    finalNotifiedStatus = true;
                    console.log(`Successfully sent recovery email to ${applicantEmail}`);
                } catch (err) {
                    console.error('Failed to send recovery email:', err);
                }
            }
        }

        // 2. Lock the job to PROCESSING
        const { error: lockError } = await supabaseAdmin
            .from('form_submissions')
            .update({ 
                analysis_status: 'PROCESSING',
                company_name: job.company_name,
                startup_notified: finalNotifiedStatus
            })
            .eq('id', lockedJobId);

        if (lockError) throw lockError;

        // 3. Fetch the active Evaluation Criteria
        const { data: activeCriteria, error: criteriaError } = await supabaseAdmin
            .from('evaluation_criteria')
            .select('criteria_text')
            .eq('is_active', true)
            .limit(1)
            .single();

        const criteriaText = activeCriteria?.criteria_text || "Analyze this pitch deck and company profile. Provide a comprehensive summary and score out of 100.";

        // 4. Construct the Prompt
        const prompt = `
      You are an expert venture capital analyst analyzing startup applications.
      Analyze the following startup application based strictly on these criteria:
      --- CRITERIA ---
      ${criteriaText}
      ----------------
      
      --- STARTUP DATA ---
      Company: ${job.company_name}
      Form Data: ${JSON.stringify(job.form_data, null, 2)}
      Pitch Deck Link: ${job.file_url || 'No deck provided'}
      ----------------
      
      Output your response ONLY in beautiful Markdown formatting.
    `;

        console.log(`Starting Gemini 2.5 Flash Analysis for job ${lockedJobId}...`);

        // Add AbortController for a hard 4-minute fetch timeout 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000);

        // 4.5 Prepare Multimodal Payload
        const contentsParts: any[] = [{ text: prompt }];

        // IF there is a file_url fetch it and attach it!
        if (job.file_url) {
            console.log(`Attempting to download Pitch Deck from: ${job.file_url}`);
            try {
                const fileRes = await fetch(job.file_url);
                if (fileRes.ok) {
                    const arrayBuffer = await fileRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const fileUrlLower = job.file_url.toLowerCase();
                    const contentType = fileRes.headers.get('content-type') || '';

                    const isPdf = fileUrlLower.includes('.pdf') || contentType.includes('pdf');
                    const isPpt = fileUrlLower.includes('.ppt') || fileUrlLower.includes('.pptx') || contentType.includes('presentation');

                    if (isPpt) {
                        try {
                            const extractedText = await parseOffice(buffer);
                            if (extractedText && String(extractedText).trim().length > 0) {
                                contentsParts.push({
                                    text: `\n\n--- Extracted Text from Pitch Deck (PPT/PPTX/DOC/DOCX) ---\n${String(extractedText)}\n-------------------------------------------------\n`
                                });
                                console.log('Successfully extracted text from PPT Pitch Deck and appended to prompt.');
                            } else {
                                console.log('PPT text extraction returned empty.');
                            }
                        } catch (parseErr) {
                            console.warn('Failed to parse text from PPT Pitch Deck:', parseErr);
                        }

                        // Extract embedded images from PPTX using JSZip
                        try {
                            const zip = await JSZip.loadAsync(buffer);
                            const imageFiles = Object.keys(zip.files).filter(name =>
                                name.startsWith('ppt/media/') &&
                                (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg'))
                            );

                            console.log(`Found ${imageFiles.length} images embedded in PPTX`);
                            let imgCount = 0;

                            for (const fileName of imageFiles) {
                                // Limit to 15 images to avoid overwhelming the prompt payload size
                                if (imgCount >= 15) break;

                                try {
                                    const imgData = await zip.files[fileName].async('base64');
                                    let mimeType = 'image/jpeg';
                                    if (fileName.endsWith('.png')) mimeType = 'image/png';

                                    contentsParts.push({
                                        inlineData: {
                                            mimeType,
                                            data: imgData
                                        }
                                    });
                                    imgCount++;
                                } catch (imgErr) {
                                    console.warn(`Failed to extract PPTX image ${fileName}`, imgErr);
                                }
                            }
                        } catch (zipErr) {
                            // If it's an old .ppt binary format, JSZip will fail, which is fine
                            console.log('Could not unzip PPTX to extract media (might be older .ppt format).', zipErr);
                        }
                    } else if (isPdf || fileUrlLower.includes('.png') || fileUrlLower.includes('.jpg') || fileUrlLower.includes('.jpeg') || buffer.length > 0) {
                        // Deduce exact mimeType for Gemini
                        let mimeType = 'application/pdf';
                        if (fileUrlLower.includes('.png') || contentType.includes('png')) mimeType = 'image/png';
                        else if (fileUrlLower.includes('.jpg') || fileUrlLower.includes('.jpeg') || contentType.includes('jpeg')) mimeType = 'image/jpeg';
                        else if (fileUrlLower.includes('.webp') || contentType.includes('webp')) mimeType = 'image/webp';

                        const base64Data = buffer.toString('base64');
                        contentsParts.push({
                            inlineData: {
                                mimeType,
                                data: base64Data
                            }
                        });
                        console.log(`Successfully attached Pitch Deck to Gemini prompt as ${mimeType}.`);
                    }
                } else {
                    console.warn(`Failed to fetch Pitch Deck: ${fileRes.statusText}`);
                }
            } catch (err) {
                console.warn('Network error while trying to fetch Pitch Deck for Gemini.', err);
            }
        }

        // 5. Helper function to call Gemini
        const callGemini = async (systemText: string, promptText: string, isJson: boolean = false) => {
            // Need a new payload so they don't share the same reference if we mutate
            const payloadParts = [...contentsParts];
            payloadParts[0] = { text: promptText }; // The first part is always the text prompt

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemText }]
                    },
                    contents: [{
                        parts: payloadParts
                    }],
                    ...(isJson ? { generationConfig: { responseMimeType: "application/json" } } : {})
                }),
                signal: controller.signal
            });

            if (!geminiRes.ok) {
                const errorData = await geminiRes.text();
                throw new Error(`Gemini API error: ${geminiRes.status} - ${errorData}`);
            }

            const aiData = await geminiRes.json();
            const aiAnalysisResult = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiAnalysisResult) {
                throw new Error("Gemini successfully responded, but generated an empty analysis.");
            }

            return aiAnalysisResult;
        };

        // 6. Run both analyses concurrently to save time
        const [customAnalysis, readinessAnalysis, onePagerAnalysis] = await Promise.all([
            callGemini(
                "You are an expert venture capital analyst. Analyze the startup based on the provided criteria. STRICT RULE: NO HALLUCINATIONS. Only mark criteria as 'Met' if there is EXPLICIT evidence in the form data or pitch deck. If evidence is missing, mark as 'Not Met' and state that information is unavailable. Output a strict JSON object with 'items' (array of [{ \"criteria\": \"Criteria Name\", \"status\": \"Met\" or \"Not Met\", \"reason\": \"Explanation\" }]) and 'conclusion' (summary paragraph).",
                `${prompt}\n\nPlease format the response as a JSON object with 'items' (the array of criteria) and a final 'conclusion' summary paragraph.`,
                true
            ),
            callGemini(
                "You are an expert venture capital analyst. Analyze the startup strictly against the 3 Readiness Checklists and output in a strict JSON object with keys: 'items' (array of [{ \"criteria\": \"The checklist item\", \"status\": \"Met\" or \"Not Met\", \"reason\": \"Explanation\" }]) and 'conclusion' (final thoughts).",
                `Analyze the following startup application based exclusively on these three Readiness Checklists:

--- 1. Quick Readiness Checklist for Accelerator Applications MVP ---
• Live, functional product with core loop working.
• 50+ real users (or 5–10 paying/pilot B2B) interacting.
• Usage/retention data available (not zero).
• Feedback collected + at least one iteration made.
• Early revenue/traction signals (even modest).
• Clear evidence it's solving a validated problem.
• Demo/link + metrics summary ready to share.

--- 2. Quick Readiness Checklist for Accelerator Applications GTM ---
• Defined ICP (Ideal Customer Profile) with evidence of validation (e.g., interviews, surveys, or segment data).
• Clear, tested value proposition tied to real pain points (user quotes or problem confirmation).
• Early acquisition channels identified and active (even 1–2 working ones with data).
• Basic sales/onboarding process exists (e.g., demo flow, pricing tested in market).
• Multi-channel or repeatable acquisition signals (e.g., organic, paid tests, partnerships, or pilots).
• Early retention/churn data available (Annual retention ≥60–70%, monthly churn ≤10%).
• Usage/traction metrics showing stickiness (e.g., sessions per user, feature engagement).
• Early revenue signals with basic unit economics (CAC: LTV ≥1:2, payback ≤18 months, gross margin ≥30%).
• MoM growth trend positive (≥5%) or customer growth (≥30–50% YoY).
• Demo/link + simple GTM hypothesis/one-pager ready to share (e.g., "Next 6 months: Double down on X channel").

--- 3. Quick Readiness Checklist for Accelerator Applications IR ---
• Clean legal/compliance setup (Pvt Ltd/LLP registered, DPIIT/UDYAM, basic cap table).
• Draft investor-ready pitch deck (problem, solution, traction, team, ask, financials).
• Financial projections available (even rough: 3–5year revenue, burn, runway ≥6 months).
• Monthly burn controlled (< ₹15L) with clear runway visibility (≥6 months minimum).
• Scalability narrative clear (2x–10x potential in 3–5 years, path to breakeven ≤24 months).
• Strong traction signals (ARR ≥₹25L+, customer base 250+ active/10+ B2B, NPS ≥30).
• Retention/moat evidence (Annual retention ≥60–70%, differentiated product or early defensibility).
• Team commitment visible (≥2 founders, full-time involvement, complementary skills).
• Early investor thinking (e.g., valuation range in mind, funding ask aligned with stage).
• Metrics summary + supporting docs ready (dashboard screenshots, revenue proof, customer testimonials).

For each checklist (MVP, GTM, IR), state whether the startup meets the criteria (cite evidence from the form data) or where they fall short. STRICT RULE: NO HALLUCINATIONS. Only use explicit information. Format the final output strictly as a JSON object containing 'items' (the checklist array) and 'conclusion' (your final assessment).

--- STARTUP DATA ---
Company: ${job.company_name}
Form Data: ${JSON.stringify(job.form_data, null, 2)}
----------------`,
                true
            ),
            callGemini(
                "You are the Chief Investment Officer at a top-tier Venture Capital firm. Your goal is to produce a high-fidelity 'One Pager' tear sheet for a startup by synthesizing information from their application form and their pitch deck slides. You MUST prioritize actual data, metrics, and evidence over marketing fluff.",
                `### OBJECTIVE
Extract and synthesize key business information into a technical JSON 'One Pager' summary.

### RESOURCES PROVIDED
1. **Form Data**: The raw responses directly from the founders.
2. **Pitch Deck**: A series of visual slides (images or text) representing the company's pitch.

### EXTRACTION GUIDELINES
- **Cross-Reference**: If the Form Data and Pitch Deck conflict, prioritize the Pitch Deck for metrics, but use the Form Data for company basics.
- **Financial Hunting**: Look deep into slides titled 'Financials', 'Traction', 'Roadmap', or 'The Market'. If a chart shows numbers, extract them for the revenue_projections array.
- **Scale Detection**: Carefully identify if numbers are in INR (₹), USD ($), Lakhs, Crores, or Millions.
- **Tone**: Keep descriptions professional, concise, and investor-readiness oriented.

### TARGET JSON SCHEMA
{
  "company_description": "A high-impact 1-2 sentence description of the product and its primary value prop.",
  "website_url": "The startup's official website URL.",
  "usp": "3-5 words describing the core competitive moat (e.g., 'Patented AI algorithm for logistics').",
  "highlights": [
    { "title": "Scalability", "description": "How the business model scales (evidence-based)." },
    { "title": "Unit Economics", "description": "Insight into margins, CAC/LTV, or pricing if found." },
    { "title": "Market Gap", "description": "The specific problem being solved." }
  ],
  "our_offering": [
    { "title": "Product/Service Name", "description": "What they are actually selling." }
  ],
  "product_features": [
    { "title": "Feature Name", "description": "A technical or functional highlight." }
  ],
  "revenue_projections_scale": "Deduce scale (e.g. Lakhs, Crores). Default: Lakhs.",
  "revenue_projections": [
    { "year": "YYYY", "value": "Numeric value only" }
  ],
  "forecast": {
    "total_turnover": "The cumulative turnover mentioned (e.g. ₹50 Lakhs).",
    "total_revenue": "The current or latest annual revenue (e.g. ₹15 Lakhs).",
    "forecast_breakdown": [
      { "name": "Revenue Stream Name", "value": "Percentage or absolute value" }
    ]
  },
  "current_traction": [
    { "title": "Metric Name", "value": "Value", "description": "Context (e.g. 'Active Monthly Users')" }
  ],
  "revenue_metrics": {
    "total_revenue": "Summary string of revenue performance.",
    "traction": "Key summary traction metric."
  },
  "startup_potential": {
    "theoretical": "A high-level 4-sentence analyst assessment of why this startup could succeed or fail in the current market.",
    "graphical_data": [
      { "subject": "Market Size", "score": 1, "fullMark": 100 },
      { "subject": "Scalability", "score": 1, "fullMark": 100 },
      { "subject": "Revenue Model", "score": 1, "fullMark": 100 },
      { "subject": "Team Strength", "score": 1, "fullMark": 100 },
      { "subject": "Product Moat", "score": 1, "fullMark": 100 }
    ]
  },
  "founders": [
    { "name": "Name", "role": "Title/Background" }
  ]
}

### CRITICAL RULES
1. **No Hallucinations**: If a metric is totally absent, use "N/A" for strings and 0 for numbers. 
2. **Numbers Only**: In the 'value' fields of arrays, provide only the number.
3. **Synthesis**: Combine insights. For example, if a founder mentions 'AI' in the form and a 'ML Pipeline' in the deck, the USP should reflect both.

--- STARTUP DATA ---
Company: ${job.company_name}
Form Data: ${JSON.stringify(job.form_data, null, 2)}
----------------`,
                true // Enforce JSON response
            )
        ]);

        clearTimeout(timeoutId);

        // 7. Save the Result & Mark COMPLETED
        const { error: updateError } = await supabaseAdmin
            .from('form_submissions')
            .update({
                ai_analysis: customAnalysis,
                readiness_analysis: readinessAnalysis,
                one_pager_analysis: typeof onePagerAnalysis === 'string' ? JSON.parse(onePagerAnalysis) : onePagerAnalysis,
                analysis_status: 'COMPLETED'
            })
            .eq('id', lockedJobId);

        if (updateError) throw updateError;

        console.log(`Job ${lockedJobId} completed successfully via Gemini 2.5 Flash.`);

        return NextResponse.json({ success: true, processedJobId: lockedJobId, message: 'AI Analysis Completed using Gemini' });

    } catch (error: any) {
        console.error('Queue Processing Error:', error);

        if (lockedJobId) {
            console.log(`Marking job ${lockedJobId} as FAILED due to error: ${error.message}`);
            await supabaseAdmin
                .from('form_submissions')
                .update({
                    analysis_status: 'FAILED',
                    ai_analysis: `# Error Generation Failed\n\nThe Gemini API failed to process this application.Please check your API key and quotas.\n\n ** System Error:** ${error.message}`
                })
                .eq('id', lockedJobId);
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
