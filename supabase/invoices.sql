create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  bill_no text unique not null,
  bill jsonb not null,
  settings jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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
