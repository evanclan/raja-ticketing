-- Debug and fix users table issues
-- Run this in Supabase SQL Editor

-- 1. Check what's in the users table
SELECT 
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- 2. Check auth.users to see what users exist
SELECT 
    id,
    email,
    raw_user_meta_data,
    user_metadata,
    created_at
FROM auth.users
ORDER BY created_at DESC;

-- 3. Check if the trigger is working by looking for users in auth but not in public.users
SELECT 
    auth.id,
    auth.email,
    auth.created_at,
    CASE WHEN public_users.id IS NULL THEN 'MISSING FROM PUBLIC.USERS' ELSE 'EXISTS' END as status
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE auth.email != 'superuser@example.com'
ORDER BY auth.created_at DESC;

-- 4. Fix: Insert missing users into public.users table
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
WHERE 
    public_users.id IS NULL 
    AND auth.email != 'superuser@example.com'
ON CONFLICT (id) DO NOTHING;

-- 5. Update existing users to have correct role if missing
UPDATE public.users 
SET role = COALESCE(role, 'user')
WHERE role IS NULL OR role = '';

-- 6. Verify the fix
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM users
WHERE role = 'user'
ORDER BY created_at DESC; 