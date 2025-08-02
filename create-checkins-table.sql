-- Create dedicated event_checkins table for better tracking
-- This table will store each check-in as a separate record for better analytics and management

CREATE TABLE IF NOT EXISTS event_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE NOT NULL,
    
    -- Check-in details
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_by UUID REFERENCES auth.users(id), -- Admin who performed check-in
    check_in_method VARCHAR(50) DEFAULT 'qr_scanner', -- 'qr_scanner', 'manual', etc.
    
    -- Participant details (cached for quick access)
    participant_name VARCHAR(255),
    participant_email VARCHAR(255),
    
    -- Family members count (for quick stats)
    family_members_count INTEGER DEFAULT 0,
    
    -- Optional notes from admin
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'cancelled', 'duplicate'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate check-ins for same user/event
    UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_at ON event_checkins(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_checkins_checked_in_by ON event_checkins(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON event_checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_method ON event_checkins(check_in_method);

-- Enable Row Level Security
ALTER TABLE event_checkins ENABLE ROW LEVEL SECURITY;

-- Create policies for event_checkins
DROP POLICY IF EXISTS "Admins can manage all checkins" ON event_checkins;
DROP POLICY IF EXISTS "Users can view their own checkins" ON event_checkins;

CREATE POLICY "Admins can manage all checkins" ON event_checkins
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own checkins" ON event_checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_checkins_updated_at ON event_checkins;
CREATE TRIGGER update_checkins_updated_at 
  BEFORE UPDATE ON event_checkins 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get detailed check-in stats for an event
CREATE OR REPLACE FUNCTION get_event_checkin_stats(target_event_id UUID)
RETURNS TABLE (
    total_registered INTEGER,
    total_checked_in INTEGER,
    total_pending INTEGER,
    total_family_members INTEGER,
    checkin_methods JSONB,
    checkin_timeline JSONB
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Total registered (approved registrations)
        (SELECT COUNT(*)::INTEGER FROM registrations WHERE event_id = target_event_id AND status = 'approved'),
        
        -- Total checked in
        (SELECT COUNT(*)::INTEGER FROM event_checkins WHERE event_id = target_event_id AND status = 'active'),
        
        -- Pending (registered but not checked in)
        (SELECT COUNT(*)::INTEGER FROM registrations r 
         WHERE r.event_id = target_event_id AND r.status = 'approved' 
         AND NOT EXISTS (SELECT 1 FROM event_checkins c WHERE c.event_id = target_event_id AND c.user_id = r.user_id AND c.status = 'active')),
        
        -- Total family members for checked-in participants
        (SELECT COALESCE(SUM(family_members_count), 0)::INTEGER FROM event_checkins WHERE event_id = target_event_id AND status = 'active'),
        
        -- Check-in methods breakdown
        (SELECT COALESCE(jsonb_object_agg(check_in_method, method_count), '{}'::jsonb)
         FROM (
             SELECT check_in_method, COUNT(*) as method_count
             FROM event_checkins 
             WHERE event_id = target_event_id AND status = 'active'
             GROUP BY check_in_method
         ) methods),
        
        -- Check-in timeline (hourly breakdown)
        (SELECT COALESCE(jsonb_object_agg(hour_slot, checkin_count), '{}'::jsonb)
         FROM (
             SELECT 
                 DATE_TRUNC('hour', checked_in_at) as hour_slot,
                 COUNT(*) as checkin_count
             FROM event_checkins 
             WHERE event_id = target_event_id AND status = 'active'
             GROUP BY DATE_TRUNC('hour', checked_in_at)
             ORDER BY hour_slot
         ) timeline);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_event_checkin_stats(UUID) TO postgres;

SELECT 'Event check-ins table created successfully with analytics functions!' as result;