-- Run this once in Supabase Dashboard -> SQL Editor -> New query
-- (in addition to invoices.sql, which is unrelated and still needed for
-- shareable /invoice/:billNo links)

-- One row per data collection (clients, bills, services, ...), matching the
-- same keys the app already used for localStorage (see STORAGE_KEYS in
-- src/context/AppContext.jsx). Kept deliberately simple - a JSON blob per
-- collection instead of a normalized table per entity - so the sync layer
-- is a couple of small functions, not a schema migration project.
create table if not exists app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Row Level Security: the app now uses real Supabase Auth (see
-- src/context/AppContext.jsx), so this table is only readable/writable by
-- signed-in users ("authenticated" role) - not by anyone holding the public
-- anon key. Every screen that touches this data already sits behind
-- ProtectedRoute/login in the app, so this matches that: no login, no data.
-- (The separate `invoices` table below stays partly anon-readable, since
-- that's what makes the public /invoice/:billNo share link work without a
-- login - see invoices.sql.)

alter table app_state enable row level security;

create policy "Signed-in staff can read state"
  on app_state for select
  to authenticated
  using (true);

create policy "Signed-in staff can insert state"
  on app_state for insert
  to authenticated
  with check (true);

create policy "Signed-in staff can update state"
  on app_state for update
  to authenticated
  using (true)
  with check (true);

-- Keep updated_at current on every upsert
create or replace function set_app_state_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_state_updated_at on app_state;
create trigger trg_app_state_updated_at
  before update on app_state
  for each row execute function set_app_state_updated_at();
