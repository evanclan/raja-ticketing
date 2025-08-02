-- Create comprehensive event_participants table
-- This table stores ALL attendees (registered users + family members) for easy reporting
-- Provides a complete roster of everyone who attended each event

CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Event and user references
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for family members
    registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
    
    -- Participant details
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Primary user email (may be null for family members)
    age INTEGER,
    
    -- Relationship info
    participant_type VARCHAR(50) NOT NULL CHECK (participant_type IN ('registered_user', 'family_member')),
    relationship_to_user VARCHAR(100), -- e.g., 'spouse', 'child', 'parent' (null for registered users)
    primary_participant_name VARCHAR(255), -- Name of the registered user (for family members)
    
    -- Check-in details
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    checked_in_by UUID REFERENCES auth.users(id), -- Admin who checked them in
    check_in_method VARCHAR(50) DEFAULT 'qr_scanner',
    
    -- Additional info
    notes TEXT,
    special_requirements TEXT, -- dietary restrictions, accessibility needs, etc.
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_checked_in_at ON event_participants(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_event_participants_type ON event_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_event_participants_name ON event_participants(full_name);

-- Enable Row Level Security
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Admins can manage all event participants" ON event_participants;
DROP POLICY IF EXISTS "Users can view participants from their events" ON event_participants;

CREATE POLICY "Admins can manage all event participants" ON event_participants
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view participants from their events" ON event_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM registrations r 
      WHERE r.event_id = event_participants.event_id 
      AND r.user_id = auth.uid()
      AND r.status = 'approved'
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_event_participants_updated_at ON event_participants;
CREATE TRIGGER update_event_participants_updated_at 
  BEFORE UPDATE ON event_participants 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get all participants for an event (formatted for easy viewing)
CREATE OR REPLACE FUNCTION get_event_participant_roster(target_event_id UUID)
RETURNS TABLE (
    participant_name VARCHAR,
    email VARCHAR,
    age INTEGER,
    participant_type VARCHAR,
    relationship VARCHAR,
    primary_participant VARCHAR,
    checked_in_time TIMESTAMP WITH TIME ZONE,
    checked_in_by_email VARCHAR,
    check_in_method VARCHAR,
    notes TEXT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.full_name as participant_name,
        COALESCE(ep.email, 'N/A') as email,
        ep.age,
        ep.participant_type,
        COALESCE(ep.relationship_to_user, 'N/A') as relationship,
        COALESCE(ep.primary_participant_name, 'N/A') as primary_participant,
        ep.checked_in_at as checked_in_time,
        COALESCE(
            (SELECT au.email FROM auth.users au WHERE au.id = ep.checked_in_by),
            'System'
        ) as checked_in_by_email,
        ep.check_in_method,
        ep.notes
    FROM event_participants ep
    WHERE ep.event_id = target_event_id
    ORDER BY 
        ep.participant_type DESC, -- registered_user first, then family_member
        ep.primary_participant_name,
        ep.checked_in_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate event participant summary
CREATE OR REPLACE FUNCTION get_event_participant_summary(target_event_id UUID)
RETURNS TABLE (
    event_title VARCHAR,
    total_attendees INTEGER,
    registered_users INTEGER,
    family_members INTEGER,
    average_age NUMERIC,
    first_checkin TIMESTAMP WITH TIME ZONE,
    last_checkin TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.title as event_title,
        COUNT(ep.*)::INTEGER as total_attendees,
        COUNT(CASE WHEN ep.participant_type = 'registered_user' THEN 1 END)::INTEGER as registered_users,
        COUNT(CASE WHEN ep.participant_type = 'family_member' THEN 1 END)::INTEGER as family_members,
        ROUND(AVG(ep.age), 1) as average_age,
        MIN(ep.checked_in_at) as first_checkin,
        MAX(ep.checked_in_at) as last_checkin
    FROM event_participants ep
    JOIN events e ON e.id = ep.event_id
    WHERE ep.event_id = target_event_id
    GROUP BY e.title;
END;
$$ LANGUAGE plpgsql;

-- Create view for easy querying of participant rosters by event
CREATE OR REPLACE VIEW event_participant_rosters AS
SELECT 
    e.title as event_name,
    e.event_date,
    e.location,
    ep.full_name as participant_name,
    ep.email,
    ep.age,
    ep.participant_type,
    ep.relationship_to_user,
    ep.primary_participant_name,
    ep.checked_in_at,
    (SELECT au.email FROM auth.users au WHERE au.id = ep.checked_in_by) as checked_in_by_admin
FROM event_participants ep
JOIN events e ON e.id = ep.event_id
ORDER BY e.event_date DESC, ep.participant_type DESC, ep.primary_participant_name, ep.checked_in_at;

-- Grant permissions
GRANT SELECT ON event_participant_rosters TO postgres;
GRANT EXECUTE ON FUNCTION get_event_participant_roster(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION get_event_participant_summary(UUID) TO postgres;

SELECT 'Event participants tracking table created successfully with roster functions!' as result;