create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text not null,
  gender text, -- 'Male' | 'Female' | null (unknown) — used for gender-specific free service eligibility
  service_name text,
  appointment_date date not null,
  appointment_time text, -- free-form, e.g. "4:30 PM"
  staff_id text, -- matches a staff member's id in the billing app (e.g. "stf_1"); null = "no preference"
  staff_name text, -- denormalized copy of the staff's name at booking time, so this reads fine even if that staff is later renamed/removed
  notes text,
  status text not null default 'pending', -- pending | confirmed | completed | cancelled
  source text default 'website',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safe to re-run on a database that already had this table from before
-- staff_id/staff_name existed.
alter table appointments add column if not exists staff_id text;
alter table appointments add column if not exists staff_name text;

-- Speeds up the "is this staff member free at this time?" lookup used by
-- get_taken_slots() in supabase/staff_availability.sql.
create index if not exists idx_appointments_staff_date on appointments (staff_id, appointment_date);

alter table appointments enable row level security;

-- Postgres has no "create policy if not exists", so drop-then-create is
-- what makes this whole file safe to re-run on a database that already
-- has it set up (re-running used to fail here with "policy already
-- exists" — and because the SQL editor runs a whole paste as one
-- transaction, that failure was rolling back the staff_id/staff_name
-- columns added above too, even though those lines had already run).
drop policy if exists "Public can create appointments" on appointments;
create policy "Public can create appointments"
  on appointments for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Signed-in staff can read appointments" on appointments;
create policy "Signed-in staff can read appointments"
  on appointments for select
  to authenticated
  using (true);

drop policy if exists "Signed-in staff can update appointments" on appointments;
create policy "Signed-in staff can update appointments"
  on appointments for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Signed-in staff can delete appointments" on appointments;
create policy "Signed-in staff can delete appointments"
  on appointments for delete
  to authenticated
  using (true);

create or replace function set_appointment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
  before update on appointments
  for each row execute function set_appointment_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table appointments;
  end if;
end $$;
