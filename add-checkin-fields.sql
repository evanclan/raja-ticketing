-- Add check-in tracking fields to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS check_in_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_by TEXT;

-- Create index for faster check-in code lookups
CREATE INDEX IF NOT EXISTS idx_registrations_check_in_code ON registrations(check_in_code);

-- Create index for check-in statistics
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at ON registrations(checked_in_at);

-- Add comment for documentation
COMMENT ON COLUMN registrations.check_in_code IS 'Unique QR code identifier for event check-in';
COMMENT ON COLUMN registrations.checked_in_at IS 'Timestamp when participant checked in at event';
COMMENT ON COLUMN registrations.checked_in_by IS 'Scanner/person who performed the check-in'; 