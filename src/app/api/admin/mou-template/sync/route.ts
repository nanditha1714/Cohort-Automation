import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');
const DOCX_PATH = path.join(TEMPLATES_DIR, 'mou_template.docx');
const TXT_PATH = path.join(TEMPLATES_DIR, 'mou_template_text.txt');

export async function POST() {
    try {
        if (!fs.existsSync(DOCX_PATH)) {
            console.error('DOCX not found at:', DOCX_PATH);
            return NextResponse.json({ 
                error: `Master Word template (.docx) not found in public/templates. Please ensure the file is named 'mou_template.docx'.` 
            }, { status: 404 });
        }

        console.log('Syncing from:', DOCX_PATH);

        // Use mammoth to extract raw text
        const result = await mammoth.extractRawText({ path: DOCX_PATH });
        const extractedText = result.value;

        if (!extractedText || extractedText.trim().length === 0) {
            return NextResponse.json({ 
                error: 'Could not extract any text from the Word file. It might be empty or in an unsupported format.' 
            }, { status: 500 });
        }

        const cleanedText = extractedText.trim();

        // Save to the .txt template used by the web editor
        if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
        fs.writeFileSync(TXT_PATH, cleanedText, 'utf8');

        console.log('Successfully synced MOU template using Mammoth. Text length:', cleanedText.length);

        return NextResponse.json({ success: true, content: cleanedText });
    } catch (error: any) {
        console.error('Template Sync Error (Mammoth):', error);
        return NextResponse.json({ 
            error: error.message || 'An unexpected error occurred during synchronization.' 
        }, { status: 500 });
    }
}
