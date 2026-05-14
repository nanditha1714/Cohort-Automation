# Supabase Admin Module

This module provides administrative functions to manage users within a Supabase project. It is specifically designed for creating internal team members, jury members, managing their active/inactive status, and resetting passwords.

## Prerequisites

1.  A Supabase project.
2.  Node.js installed in your environment.
3.  The Service Role Key from your Supabase project (used to bypass Row-Level Security and utilize the Admin API).

## Installation

If you dropped these files into an existing project, ensure you have `@supabase/supabase-js` installed:

```bash
npm install @supabase/supabase-js dotenv
```

## Setup

1.  **Database Schema**: Before using this module, you need to create the required tables in your Supabase database.
    *   Open your Supabase Dashboard.
    *   Navigate to the **SQL Editor**.
    *   Copy the contents of `supabase/schema.sql` and run it. This creates the `user_role` enum, the `user_profiles` table, and sets up row-level security.

2.  **Environment Variables**: The module relies on environment variables for authentication. Create a `.env` file in the root of your project:

```env
SUPABASE_URL=your_project_url
# IMPORTANT: Use the SERVICE_ROLE_KEY, NOT the anon key. Keep this key secure!
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage Example

Import the functions from `src/admin.ts` to manage users in your backend application or serverless function.

```typescript
// example.ts
import dotenv from 'dotenv';
dotenv.config();

import {
  createInternalTeamUser,
  createJuryUser,
  changeUserStatus,
  resetUserPassword
} from './src/admin';

async function runExample() {
  try {
    // 1. Create an Internal Team member
    console.log('Creating Internal Team User...');
    const internalUser = await createInternalTeamUser(
      'admin1@example.com',
      'securePassword123!',
      'Alice Admin'
    );
    console.log('Created:', internalUser);

    // 2. Create a Jury member
    console.log('\nCreating Jury User...');
    const juryUser = await createJuryUser(
      'jury1@example.com',
      'securePassword123!',
      'Bob Judge'
    );
    console.log('Created:', juryUser);

    // 3. Deactivate the Jury member (this bans them from logging in)
    console.log('\nDeactivating Jury User...');
    const statusResult = await changeUserStatus(juryUser.userId, 'INACTIVE');
    console.log(statusResult);

    // 4. Reset the internal team member's password
    console.log('\nResetting Internal User Password...');
    const resetResult = await resetUserPassword(internalUser.userId, 'newSecurePassword456!');
    console.log(resetResult);

  } catch (error) {
    console.error('Error in Admin Module:', error);
  }
}

runExample();
```

## Security Considerations

Because this module uses the `SUPABASE_SERVICE_ROLE_KEY`, it has unrestricted access to your database and authentication settings. 
**Never expose these functions or the service key to the client-side browser application.** 
These functions should only be called from a secure, trusted server environment (like a Node.js API, Next.js API Routes, or Edge Functions) where you have already verified the caller's authorization to perform administrative actions.
