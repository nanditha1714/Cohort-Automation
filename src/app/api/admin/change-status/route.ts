import { NextResponse } from 'next/server';
import { changeUserStatus } from '@/lib/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, status } = body;

        if (!userId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await changeUserStatus(userId, status);
        return NextResponse.json({ result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
