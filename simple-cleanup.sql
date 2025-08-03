-- Simple cleanup script for registration issues
-- Run this in Supabase SQL Editor

-- 1. Check current auth users
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email != 'superuser@example.com'
ORDER BY created_at DESC;

-- 2. Check current public.users
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Find users that exist in auth but not in public.users (these cause registration issues)
SELECT 
    auth.id,
    auth.email,
    auth.created_at,
    'EXISTS IN AUTH BUT NOT IN PUBLIC.USERS' as issue
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE public_users.id IS NULL 
AND auth.email != 'superuser@example.com'
ORDER BY auth.created_at DESC;

-- 4. If you want to clean up orphaned auth users (BE CAREFUL!)
-- Uncomment the lines below and run to delete auth users that don't exist in public.users
-- This will allow you to register with those emails again

/*
DELETE FROM auth.users 
WHERE id IN (
    SELECT auth.id
    FROM auth.users auth
    LEFT JOIN public.users public_users ON auth.id = public_users.id
    WHERE public_users.id IS NULL 
    AND auth.email != 'superuser@example.com'
);
*/

-- 5. After cleanup, check again
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email != 'superuser@example.com'
ORDER BY created_at DESC; 