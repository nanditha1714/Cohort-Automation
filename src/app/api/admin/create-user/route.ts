import { NextResponse } from 'next/server';
import { createAdminUser, createInternalTeamUser, createJuryUser } from '@/lib/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, type, department } = body;

        // Default to "None" if department isn't passed (for backward compatibility)
        const userDepartment = department || 'None';

        if (!email || !password || !name || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let user;
        if (type === 'ADMIN') {
            user = await createAdminUser(email, password, name, userDepartment);
        } else if (type === 'INTERNAL_TEAM') {
            user = await createInternalTeamUser(email, password, name, userDepartment);
        } else if (type === 'JURY') {
            user = await createJuryUser(email, password, name, userDepartment);
        } else {
            return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
