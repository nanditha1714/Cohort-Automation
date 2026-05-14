import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/admin';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');

        let users = await getAllUsers();
        
        if (role) {
            users = users.filter(u => u.role === role);
        }

        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
