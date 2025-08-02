-- COMPLETE DATABASE SETUP FOR RAJA TICKETING SYSTEM
-- Run this script in Supabase SQL Editor to create all necessary tables

-- ========================================
-- 1. CREATE UTILITY FUNCTIONS FIRST
-- ========================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 2. CREATE USERS TABLE (references auth.users)
-- ========================================

CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. CREATE EVENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    capacity INTEGER NOT NULL,
    image_url TEXT,
    start_registration TIMESTAMP WITH TIME ZONE,
    end_registration TIMESTAMP WITH TIME ZONE,
    ticket_photo_url TEXT,
    additional_info TEXT,
    category VARCHAR(100),
    organizer_name VARCHAR(255),
    organizer_contact VARCHAR(255),
    venue_details TEXT,
    dress_code VARCHAR(100),
    age_restriction VARCHAR(50),
    gallery_images TEXT[],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Enable Row Level Security for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "Public can view active events" ON events;

CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (status = 'active');

-- Create trigger for events
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. CREATE REGISTRATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method TEXT DEFAULT 'manual',
    notes TEXT,
    -- Check-in tracking columns
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    checked_in_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Create indexes for registrations
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at ON registrations(checked_in_at);

-- Enable Row Level Security for registrations
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for registrations
DROP POLICY IF EXISTS "Users can view their own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can create registrations" ON registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON registrations;

CREATE POLICY "Users can view their own registrations" ON registrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create registrations" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all registrations" ON registrations
  FOR ALL USING (auth.role() = 'authenticated');

-- Create trigger for registrations
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
CREATE TRIGGER update_registrations_updated_at 
  BEFORE UPDATE ON registrations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. CREATE FAMILY MEMBERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    relationship VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for family_members
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON family_members(created_at);

-- Enable Row Level Security for family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Create policies for family_members
DROP POLICY IF EXISTS "Users can manage their own family members" ON family_members;
DROP POLICY IF EXISTS "Admins can view all family members" ON family_members;

CREATE POLICY "Users can manage their own family members" ON family_members
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all family members" ON family_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger for family_members
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
CREATE TRIGGER update_family_members_updated_at 
  BEFORE UPDATE ON family_members 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. CREATE SUPERUSERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS superusers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default superuser (update email as needed)
INSERT INTO superusers (email) 
VALUES ('superuser@example.com') 
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 7. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get admins
CREATE OR REPLACE FUNCTION get_admins()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.users.id,
        auth.users.email,
        auth.users.created_at
    FROM auth.users
    WHERE 
        (auth.users.raw_user_meta_data->>'role' = 'admin' OR auth.users.user_metadata->>'role' = 'admin')
        AND auth.users.email != 'superuser@example.com';
END;
$$ LANGUAGE plpgsql;

-- Function to get all users
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        auth.users.id,
        auth.users.email,
        auth.users.created_at
    FROM auth.users
    WHERE auth.users.email != 'superuser@example.com';
END;
$$ LANGUAGE plpgsql;

-- Function to get family members for a user
CREATE OR REPLACE FUNCTION get_family_members_for_user(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name VARCHAR,
    age INTEGER,
    relationship VARCHAR,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        family_members.id,
        family_members.full_name,
        family_members.age,
        family_members.relationship,
        family_members.notes,
        family_members.created_at
    FROM family_members
    WHERE family_members.user_id = target_user_id
    ORDER BY family_members.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. MIGRATE EXISTING AUTH USERS
-- ========================================

-- Migrate existing users from auth.users to public.users
INSERT INTO public.users (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'user') as role
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, users.full_name),
  role = COALESCE(EXCLUDED.role, users.role);

-- ========================================
-- 9. GRANT PERMISSIONS
-- ========================================

GRANT SELECT ON auth.users TO postgres;
GRANT EXECUTE ON FUNCTION get_admins() TO postgres;
GRANT EXECUTE ON FUNCTION get_all_users() TO postgres;
GRANT EXECUTE ON FUNCTION get_family_members_for_user(UUID) TO postgres;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'Complete database setup completed successfully! All tables created with check-in functionality.' as result;