-- Run once in the Supabase SQL editor (safe to re-run).
-- Tracks which WhatsApp messages have already gone out for an appointment, so
-- the automatic reminder is sent only once even if the app is open on several
-- devices, and the Appointments page can show "Confirmation sent".
alter table appointments add column if not exists confirmation_sent_at timestamptz;
alter table appointments add column if not exists reminder_sent_at timestamptz;
