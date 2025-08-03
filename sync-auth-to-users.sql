-- Sync auth users to public.users table
-- Run this in Supabase SQL Editor to fix the missing users

-- 1. Check what users exist in auth but not in public.users
SELECT 
    auth.id,
    auth.email,
    auth.created_at,
    'MISSING FROM PUBLIC.USERS' as status
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE public_users.id IS NULL 
AND auth.email != 'superuser@example.com'
ORDER BY auth.created_at DESC;

-- 2. Insert missing users into public.users table
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
SELECT 
    auth.id,
    auth.email,
    COALESCE(auth.raw_user_meta_data->>'full_name', auth.email) as full_name,
    COALESCE(auth.raw_user_meta_data->>'role', 'user') as role,
    auth.created_at,
    auth.created_at as updated_at
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE public_users.id IS NULL 
AND auth.email != 'superuser@example.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    role = COALESCE(EXCLUDED.role, users.role),
    updated_at = NOW();

-- 3. Verify the sync worked
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- 4. Check for any remaining orphaned users
SELECT 
    auth.id,
    auth.email,
    auth.created_at,
    CASE WHEN public_users.id IS NULL THEN 'STILL MISSING' ELSE 'SYNCED' END as status
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE auth.email != 'superuser@example.com'
ORDER BY auth.created_at DESC; 

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a new policy that allows authenticated users to read all users
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Also add a policy for superusers to manage all users
CREATE POLICY "Superusers can manage all users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Superusers can manage all users" ON users;

-- Create a simple policy that allows all authenticated users to read the users table
CREATE POLICY "Allow authenticated users to read users" ON users
  FOR SELECT TO authenticated USING (true);

-- Create a policy for users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Create a policy for inserting new users
CREATE POLICY "Allow inserting users" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create a policy for deleting users (for admin functionality)
CREATE POLICY "Allow deleting users" ON users
  FOR DELETE TO authenticated USING (true);