-- Cleanup script for auth users causing registration issues
-- Run this in Supabase SQL Editor if you need to clean up auth users

-- 1. Check what users exist in auth system
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data,
    user_metadata
FROM auth.users
ORDER BY created_at DESC;

-- 2. Check what users exist in public.users table
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC;

-- 3. Find orphaned auth users (exist in auth but not in public.users)
SELECT 
    auth.id,
    auth.email,
    auth.created_at,
    CASE WHEN public_users.id IS NULL THEN 'ORPHANED' ELSE 'EXISTS' END as status
FROM auth.users auth
LEFT JOIN public.users public_users ON auth.id = public_users.id
WHERE auth.email != 'superuser@example.com'
ORDER BY auth.created_at DESC;

-- 4. Find users that exist in public.users but not in auth.users
SELECT 
    public_users.id,
    public_users.email,
    public_users.created_at,
    'MISSING FROM AUTH' as status
FROM public.users public_users
LEFT JOIN auth.users auth ON public_users.id = auth.id
WHERE auth.id IS NULL
ORDER BY public_users.created_at DESC;

-- 5. Clean up orphaned auth users (BE CAREFUL - this will delete auth users)
-- Uncomment the lines below if you want to delete orphaned auth users
-- WARNING: This will permanently delete users from the auth system

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

-- 6. Clean up orphaned public.users (BE CAREFUL - this will delete public users)
-- Uncomment the lines below if you want to delete orphaned public users
-- WARNING: This will permanently delete users from the public.users table

/*
DELETE FROM public.users 
WHERE id IN (
    SELECT public_users.id
    FROM public.users public_users
    LEFT JOIN auth.users auth ON public_users.id = auth.id
    WHERE auth.id IS NULL
);
*/

-- 7. Reset the sequence if needed (if you deleted users)
-- Uncomment if you get sequence errors after deletion
/*
SELECT setval('auth.users_id_seq', (SELECT MAX(id::text::bigint) FROM auth.users));
*/ 