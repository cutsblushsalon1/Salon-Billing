create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text not null,
  gender text, -- 'Male' | 'Female' | null (unknown) — used for gender-specific free service eligibility
  service_name text,
  appointment_date date not null,
  appointment_time text, -- free-form, e.g. "4:30 PM"
  notes text,
  status text not null default 'pending', -- pending | confirmed | completed | cancelled
  source text default 'website',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table appointments enable row level security;

create policy "Public can create appointments"
  on appointments for insert
  to anon, authenticated
  with check (true);

create policy "Signed-in staff can read appointments"
  on appointments for select
  to authenticated
  using (true);

create policy "Signed-in staff can update appointments"
  on appointments for update
  to authenticated
  using (true)
  with check (true);

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

alter publication supabase_realtime add table appointments;
