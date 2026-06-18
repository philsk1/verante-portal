-- Appointment reminder toggle — lets each tenant opt in/out of automated reminders
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reminders_enabled boolean DEFAULT false;
