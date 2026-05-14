import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const { id } = params;
        const { 
            company_name = 'Startup', 
            founder = 'Founder', 
            address = 'Address', 
            date = new Date().toLocaleDateString('en-GB') 
        } = await req.json();

        // 1. Generate MOU
        const templatePath = path.join(process.cwd(), 'public', 'templates', 'mou_template.docx');
        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({ error: 'MOU template not found' }, { status: 500 });
        }

        console.log('Rendering MOU with data:', { company_name, founder, address, date });

        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            // If a value is missing, return the placeholder so it's visible what's missing
            nullGetter(part) {
                if (part.type === "placeholder") {
                    return "{ " + part.value + " }";
                }
                return "";
            }
        });

        const renderData = {
            company_name: String(company_name || 'Startup Name').trim(),
            founder: String(founder || 'Founder Name').trim(),
            address: String(address || 'Company Address').trim(),
            date: String(date || new Date().toLocaleDateString('en-GB')).trim(),
            // Common variations/aliases
            startup_name: String(company_name || 'Startup Name').trim(),
            startup: String(company_name || 'Startup Name').trim(),
            name: String(founder || 'Founder Name').trim(),
        };

        try {
            doc.render(renderData);
        } catch (error: any) {
            console.error('Docxtemplater Error Details:', JSON.stringify(error.properties?.errors, null, 2));
            // Try fallback rendering if primary fails
            try {
                doc.render({ ...renderData, company_name: 'ERROR' });
            } catch (inner) {}
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });

        const safeCompanyName = String(company_name || 'Startup').replace(/[^a-zA-Z0-9]/g, '_');

        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="MOU_Draft_${safeCompanyName}.docx"`
            }
        });


    } catch (error: any) {
        console.error('Generate MOU Draft Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
