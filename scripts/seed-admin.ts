import * as dotenv from 'dotenv';
import path from 'path';

// Load the .env file explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Must import createClient to do the custom admin creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Role Key in .env');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function createSuperAdmin() {
    const email = 'admin@example.com';
    const password = 'SuperSecurePassword123!';
    const name = 'Super Admin';
    const role = 'ADMIN';

    console.log(`Creating Admin User: ${email}`);

    try {
        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`User ${email} already exists in auth.users.`);
            } else {
                throw new Error(`Failed to create auth user: ${authError.message}`);
            }
        }

        // Attempt to get user ID if it already existed
        let userId = authData?.user?.id;
        if (!userId) {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = data.users.find(u => u.email === email);
            if (existingUser) userId = existingUser.id;
        }

        if (!userId) throw new Error('Could not determine user ID');

        // 2. Upsert Profile to ensure ADMIN role
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .upsert({
                id: userId,
                name,
                role,
                status: 'ACTIVE'
            });

        if (profileError) {
            throw new Error(`Failed to create or update user profile: ${profileError.message}`);
        }

        console.log('✅ Successfully created Super Admin!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (err: any) {
        console.error('❌ Error creating super admin:', err.message);
    }
}

createSuperAdmin();
