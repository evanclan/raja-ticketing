ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'; 