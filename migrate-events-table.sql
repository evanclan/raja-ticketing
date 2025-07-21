-- Migration script to add new columns to events table
-- Run this in your Supabase SQL Editor

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS start_registration TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_registration TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ticket_photo_url TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS organizer_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS venue_details TEXT,
ADD COLUMN IF NOT EXISTS dress_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(50),
ADD COLUMN IF NOT EXISTS gallery_images TEXT[];

-- Update existing events to have default values for new columns
UPDATE events SET 
    start_registration = NULL,
    end_registration = NULL,
    ticket_photo_url = NULL,
    additional_info = NULL,
    category = NULL,
    organizer_name = NULL,
    organizer_contact = NULL,
    venue_details = NULL,
    dress_code = NULL,
    age_restriction = NULL,
    gallery_images = NULL
WHERE start_registration IS NULL;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position; 