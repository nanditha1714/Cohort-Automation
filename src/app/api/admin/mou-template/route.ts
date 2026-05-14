import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const templatePath = path.join(process.cwd(), 'public', 'templates', 'mou_template.docx');
        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }
        const buffer = fs.readFileSync(templatePath);
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': 'attachment; filename="master_mou_template.docx"'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { fileBase64 } = await req.json();
        if (!fileBase64) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const templatesDir = path.join(process.cwd(), 'public', 'templates');
        
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }

        const templatePath = path.join(templatesDir, 'mou_template.docx');
        
        // Backup old template
        if (fs.existsSync(templatePath)) {
            const backupPath = path.join(templatesDir, `mou_template_backup_${Date.now()}.docx`);
            fs.copyFileSync(templatePath, backupPath);
        }

        fs.writeFileSync(templatePath, buffer);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update Template Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
