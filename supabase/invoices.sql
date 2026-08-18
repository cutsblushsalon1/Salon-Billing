-- Run this once in Supabase Dashboard -> SQL Editor -> New query

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  bill_no text unique not null,
  bill jsonb not null,
  settings jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security: reads stay open to "anon" on purpose - that's what
-- lets a customer open a shared /invoice/:billNo link without logging in.
-- Nobody can list all invoices without knowing the exact bill_no (the app
-- always queries by bill_no), but note this doesn't restrict by row: any
-- anon caller CAN select the invoices table via the API directly if they
-- know how. That's an acceptable tradeoff for a small single-location salon
-- app's read access.
--
-- Writes are different: now that the app has real Supabase Auth (see
-- src/context/AppContext.jsx), only signed-in staff can insert/update
-- invoices - pushInvoiceToSupabase only ever runs after a staff member is
-- logged in and creates/edits a bill, so this doesn't take anything away
-- from the app, it just closes off writes to anyone with just the anon key.

alter table invoices enable row level security;

create policy "Public can read invoices"
  on invoices for select
  to anon, authenticated
  using (true);

create policy "Signed-in staff can insert invoices"
  on invoices for insert
  to authenticated
  with check (true);

create policy "Signed-in staff can update invoices"
  on invoices for update
  to authenticated
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
