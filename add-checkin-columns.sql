-- Add check-in functionality to registrations table
-- This migration adds the missing columns for QR code check-in tracking

-- Add check-in columns to registrations table
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id);

-- Create index for better performance on check-in queries
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in);
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at ON registrations(checked_in_at);

-- Add comment for documentation
COMMENT ON COLUMN registrations.checked_in IS 'Boolean flag indicating if participant has checked in';
COMMENT ON COLUMN registrations.checked_in_at IS 'Timestamp when participant checked in';
COMMENT ON COLUMN registrations.checked_in_by IS 'Admin who performed the check-in';

SELECT 'Check-in columns added successfully to registrations table!' as result;