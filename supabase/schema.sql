-- Create custom enum type for user roles
CREATE TYPE public.user_role AS ENUM (
  'ADMIN',
  'INTERNAL_TEAM',
  'JURY',
  'USER'
);

-- Create a table for user profiles linked to Supabase Auth
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users (id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'USER',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Note: Since the admin module will use the Service Role Key from a backend/serverless environment,
-- the Service Role Key bypasses RLS policies entirely.
-- However, we still define RLS policies here to ensure that if users query this table
-- from the client (e.g., using the anon or authenticated role), they cannot see or modify other users' roles
-- unless they are an ADMIN.

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Only ADMINs can view all profiles
-- This requires a helper function to check if the current user is an admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin());

-- Policy: Only ADMINs can insert/update/delete profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.user_profiles
  FOR ALL
  USING (public.is_admin());

-- Trigger to automatically create a profile entry when a new user signs up
-- We'll allow the profile to be created via the Admin module instead of a trigger
-- because the admin module will explicitly create the profile row with the correct name and role.
-- If you want auto-creation on normal signups, you can uncomment this:
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Unknown User'), 'USER');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
