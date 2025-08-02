-- Create family_members table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER,
    relationship VARCHAR(100), -- e.g., 'spouse', 'child', 'parent', 'sibling'
    notes TEXT, -- any additional notes about the family member
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_created_at ON family_members(created_at);

-- Enable Row Level Security
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own family members
CREATE POLICY "Users can manage their own family members" ON family_members
  FOR ALL USING (auth.uid() = user_id);

-- Create policy for admins to view all family members
CREATE POLICY "Admins can view all family members" ON family_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_family_members_updated_at 
  BEFORE UPDATE ON family_members 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get family members for a user (for admin use)
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_family_members_for_user(UUID) TO postgres;