-- Run this once in Supabase Dashboard -> SQL Editor -> New query

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  bill_no text unique not null,
  bill jsonb not null,
  settings jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: the app uses the public "anon" key from the browser
-- (there's no separate backend), so read/write has to be opened up to anon.
-- Anyone with a direct invoice link can read that one invoice; nobody can
-- read/list all invoices without the exact bill_no due to the app querying
-- by bill_no, but note RLS here doesn't restrict by row - any anon caller
-- CAN select/insert/update the invoices table via the API directly if they
-- know how. That's an acceptable tradeoff for a small single-location salon
-- app; see the chat message for a tighter, edge-function-based alternative.

alter table invoices enable row level security;

create policy "Public can read invoices"
  on invoices for select
  to anon
  using (true);

create policy "App can insert invoices"
  on invoices for insert
  to anon
  with check (true);

create policy "App can update invoices"
  on invoices for update
  to anon
  using (true)
  with check (true);

-- Keep updated_at current on every upsert
create or replace function set_invoice_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoices_updated_at on invoices;
create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function set_invoice_updated_at();
