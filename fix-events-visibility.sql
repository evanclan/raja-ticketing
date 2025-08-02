-- Fix events visibility for authenticated users
-- This script adds the missing RLS policy for authenticated users to view active events

-- Add policy for authenticated users to view active events
CREATE POLICY "Authenticated users can view active events" ON events
  FOR SELECT TO authenticated USING (status = 'active');

-- Optional: If you want authenticated users to see all events (including inactive)
-- Uncomment the line below instead of the one above:
-- CREATE POLICY "Authenticated users can view all events" ON events
--   FOR SELECT TO authenticated USING (true);