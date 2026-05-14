import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using Service Role Key
// IMPORTANT: The Service Role Key bypasses Row Level Security (RLS) entirely.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase URL and Service Role Key must be provided in environment variables.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

type Role = 'ADMIN' | 'INTERNAL_TEAM' | 'JURY' | 'USER';
type Status = 'ACTIVE' | 'INACTIVE';

/**
 * Validates the email format.
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Helper to create a user and their profile simultaneously.
 */
async function createUserAndProfile(email: string, password: string, name: string, role: Role, department: string) {
    if (!isValidEmail(email)) throw new Error('Invalid email format.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters long.');

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for admin-created users
    });

    if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);

    const userId = authData.user.id;

    // 2. Create the associated profile in public.user_profiles
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
            id: userId,
            name,
            role,
            department,
            status: 'ACTIVE'
        });

    if (profileError) {
        // Attempt rollback if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
    }

    return { userId, email, role, name, department, status: 'ACTIVE' };
}

/**
 * Internal Team Management: Create internal team account
 */
export async function createInternalTeamUser(email: string, password: string, name: string, department: string) {
    return createUserAndProfile(email, password, name, 'INTERNAL_TEAM', department);
}

/**
 * Admin Management: Create admin account
 */
export async function createAdminUser(email: string, password: string, name: string, department: string) {
    return createUserAndProfile(email, password, name, 'ADMIN', department);
}

/**
 * Jury Management: Create jury account
 */
export async function createJuryUser(email: string, password: string, name: string, department: string) {
    return createUserAndProfile(email, password, name, 'JURY', department);
}

/**
 * User Control: Activate or deactivate ANY user account (Internal, Jury, etc.)
 */
export async function changeUserStatus(userId: string, status: Status) {
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({ status })
        .eq('id', userId);

    if (profileError) throw new Error(`Failed to update profile status: ${profileError.message}`);

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: status === 'INACTIVE' ? '876000h' : 'none' }
    );

    if (authError) throw new Error(`Failed to update auth ban status: ${authError.message}`);

    return { success: true, message: `User ${userId} status changed to ${status}` };
}

/**
 * User Control: Reset passwords for ANY user account
 */
export async function resetUserPassword(userId: string, newPassword: string) {
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters long.');

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );

    if (error) throw new Error(`Failed to reset password: ${error.message}`);

    return { success: true, message: `Password reset successfully for user ${userId}` };
}

/**
 * User Control: Update User Details (Name, Email, Role, Department)
 */
export async function updateUserDetails(userId: string, updates: { email?: string, name?: string, role?: string, department?: string }) {
    // 1. Update Auth Email if provided
    if (updates.email) {
        if (!isValidEmail(updates.email)) throw new Error('Invalid email format.');
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: updates.email,
            email_confirm: true // auto confirm the new email
        });
        if (authError) throw new Error(`Failed to update user email: ${authError.message}`);
    }

    // 2. Update Profile Fields if provided
    const profileUpdates: any = {};
    if (updates.name) profileUpdates.name = updates.name;
    if (updates.role) profileUpdates.role = updates.role;
    if (updates.department !== undefined) profileUpdates.department = updates.department; // allow empty strings or "None"

    if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .update(profileUpdates)
            .eq('id', userId);

        if (profileError) throw new Error(`Failed to update user profile: ${profileError.message}`);
    }

    return { success: true, message: `User ${userId} updated successfully` };
}

/**
 * Fetch all users for the dashboard.
 */
export async function getAllUsers() {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, name, role, department, status, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch users: ${error.message}`);

    // To get emails, we would need to join with auth.users if possible, 
    // or fetch auth users via admin api and merge. For simplicity and security,
    // we can use admin API to fetch all user emails if needed:
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(`Failed to fetch auth users: ${authError.message}`);

    const mergedUsers = data.map(profile => {
        const authUser = authUsers.users.find(u => u.id === profile.id);
        return {
            ...profile,
            email: authUser?.email || 'N/A'
        };
    });

    return mergedUsers;
}
