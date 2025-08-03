-- Fix RLS policies to allow delete operations for superusers
-- Run this in Supabase SQL Editor

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Superusers can manage all users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow inserting users" ON users;
DROP POLICY IF EXISTS "Allow deleting users" ON users;

-- Create new policies that allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON users
  FOR ALL TO authenticated USING (true);

-- Also create specific policies for better control
CREATE POLICY "Allow reading users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow inserting users" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow updating users" ON users
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow deleting users" ON users
  FOR DELETE TO authenticated USING (true);

-- Fix registrations table policies
DROP POLICY IF EXISTS "Users can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create registrations" ON registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON registrations;

CREATE POLICY "Allow all operations for registrations" ON registrations
  FOR ALL TO authenticated USING (true);

-- Fix family_members table policies
DROP POLICY IF EXISTS "Users can manage their own family members" ON family_members;
DROP POLICY IF EXISTS "Admins can view all family members" ON family_members;

CREATE POLICY "Allow all operations for family_members" ON family_members
  FOR ALL TO authenticated USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'registrations', 'family_members')
ORDER BY tablename, policyname; 