-- Create events table with enhanced fields
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
    -- New fields for enhanced event creation
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
    gallery_images TEXT[], -- Array of image URLs
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy for admins (all operations)
CREATE POLICY "Admins can manage all events" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Create policy for public read access to active events
CREATE POLICY "Public can view active events" ON events
  FOR SELECT USING (status = 'active');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 

-- Create superusers table
CREATE TABLE IF NOT EXISTS superusers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default superuser
INSERT INTO superusers (email) 
VALUES ('superuser@example.com') 
ON CONFLICT (email) DO NOTHING;

-- Create function to get admins
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

-- Create function to get all users
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

-- Grant necessary permissions
GRANT SELECT ON auth.users TO postgres;
GRANT EXECUTE ON FUNCTION get_admins() TO postgres;
GRANT EXECUTE ON FUNCTION get_all_users() TO postgres; 