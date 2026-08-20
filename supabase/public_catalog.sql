create table if not exists public_catalog (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table public_catalog enable row level security;

create policy "Anyone can read the public catalog"
  on public_catalog for select
  to anon, authenticated
  using (true);

create policy "Signed-in staff can write the public catalog"
  on public_catalog for insert
  to authenticated
  with check (true);

create policy "Signed-in staff can update the public catalog"
  on public_catalog for update
  to authenticated
  using (true)
  with check (true);

create or replace function set_public_catalog_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_public_catalog_updated_at on public_catalog;
create trigger trg_public_catalog_updated_at
  before update on public_catalog
  for each row execute function set_public_catalog_updated_at();
