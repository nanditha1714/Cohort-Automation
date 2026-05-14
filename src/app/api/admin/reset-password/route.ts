import { NextResponse } from 'next/server';
import { resetUserPassword } from '@/lib/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await resetUserPassword(userId, newPassword);
        return NextResponse.json({ result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
