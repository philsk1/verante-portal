-- Add cancel_token to appointments for direct email cancel links
-- Existing rows get a random UUID automatically via DEFAULT
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancel_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS appointments_cancel_token_idx ON appointments(cancel_token);
