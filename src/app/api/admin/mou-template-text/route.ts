import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const TEMPLATE_FILE = path.join(process.cwd(), 'public', 'templates', 'mou_template_text.txt');

export async function GET() {
    try {
        let content = '';
        const wordPath = path.join(process.cwd(), 'public', 'templates', 'mou_template.docx');
        
        if (fs.existsSync(wordPath)) {
            try {
                const mammoth = require('mammoth');
                const buffer = fs.readFileSync(wordPath);
                // Extracting as raw text but preserving some structure
                const result = await mammoth.extractRawText({ buffer });
                content = result.value;
            } catch (err) {
                console.error('Mammoth extraction error:', err);
                // Fallback to .txt if word extraction fails
                if (fs.existsSync(TEMPLATE_FILE)) {
                    content = fs.readFileSync(TEMPLATE_FILE, 'utf8');
                }
            }
        } else if (fs.existsSync(TEMPLATE_FILE)) {
            content = fs.readFileSync(TEMPLATE_FILE, 'utf8');
        } else {
            content = 'MOU template file not found. Please upload mou_template.docx to public/templates/';
        }
        
        return NextResponse.json({ content });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { content } = await req.json();
        const dir = path.dirname(TEMPLATE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(TEMPLATE_FILE, content, 'utf8');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
