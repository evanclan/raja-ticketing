-- Add the missing checked_in boolean column to registrations table
-- This ensures the database schema matches what the application expects

-- Add the checked_in column if it doesn't exist
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

-- Update existing records: set checked_in = true where checked_in_at is not null
UPDATE registrations 
SET checked_in = TRUE 
WHERE checked_in_at IS NOT NULL AND checked_in IS DISTINCT FROM TRUE;

-- Create a trigger to automatically set checked_in = true when checked_in_at is set
CREATE OR REPLACE FUNCTION auto_set_checked_in()
RETURNS TRIGGER AS $$
BEGIN
  -- If checked_in_at is being set to a non-null value, set checked_in to true
  IF NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN
    NEW.checked_in = TRUE;
  END IF;
  
  -- If checked_in_at is being set to null, set checked_in to false
  IF NEW.checked_in_at IS NULL AND OLD.checked_in_at IS NOT NULL THEN
    NEW.checked_in = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically maintain checked_in column
DROP TRIGGER IF EXISTS auto_set_checked_in_trigger ON registrations;
CREATE TRIGGER auto_set_checked_in_trigger
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_checked_in();

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in ON registrations(checked_in);

SELECT 'Missing checked_in column added successfully!' as result;