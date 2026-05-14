import { NextResponse } from 'next/server';
import { updateUserDetails } from '@/lib/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, email, name, role, department } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
        }

        const updates: any = {};
        if (email !== undefined) updates.email = email;
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (department !== undefined) updates.department = department;

        const result = await updateUserDetails(userId, updates);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
