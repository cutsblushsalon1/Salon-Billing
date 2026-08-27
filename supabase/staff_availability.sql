create or replace function get_taken_slots(p_staff_id text, p_date date)
returns table (appointment_time text)
language sql
security definer
set search_path = public
stable
as $$
  select appointment_time
  from appointments
  where staff_id = p_staff_id
    and appointment_date = p_date
    and appointment_time is not null
    and status <> 'cancelled';
$$;

grant execute on function get_taken_slots(text, date) to anon, authenticated;

create or replace function get_full_slots(p_date date)
returns table (appointment_time text)
language sql
security definer
set search_path = public
stable
as $$
  with staff_total as (
    select coalesce(jsonb_array_length(value), 0) as n
    from public_catalog
    where key = 'staff'
  ),
  counts as (
    select appointment_time, count(*) as booked
    from appointments
    where appointment_date = p_date
      and appointment_time is not null
      and status <> 'cancelled'
    group by appointment_time
  )
  select counts.appointment_time
  from counts, staff_total
  where staff_total.n > 0 and counts.booked >= staff_total.n;
$$;

grant execute on function get_full_slots(date) to anon, authenticated;

create or replace function enforce_appointment_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  staff_total int;
  booked_count int;
begin
  if new.status = 'cancelled' or new.appointment_time is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.appointment_date::text || '|' || new.appointment_time, 0));

  if new.staff_id is not null then
    -- A specific staff member can only hold one active appointment per slot.
    if exists (
      select 1 from appointments
      where staff_id = new.staff_id
        and appointment_date = new.appointment_date
        and appointment_time = new.appointment_time
        and status <> 'cancelled'
        and id is distinct from new.id
    ) then
      raise exception 'SLOT_TAKEN: % is already booked at % on %', coalesce(new.staff_name, 'that stylist'), new.appointment_time, new.appointment_date
        using errcode = '23505';
    end if;
  else
  
    select coalesce(jsonb_array_length(value), 0) into staff_total
    from public_catalog where key = 'staff';

    if staff_total > 0 then
      select count(*) into booked_count
      from appointments
      where appointment_date = new.appointment_date
        and appointment_time = new.appointment_time
        and status <> 'cancelled'
        and id is distinct from new.id;

      if booked_count >= staff_total then
        raise exception 'SLOT_FULL: every stylist is already booked at % on %', new.appointment_time, new.appointment_date
          using errcode = '23505';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_slot_capacity on appointments;
create trigger trg_enforce_slot_capacity
  before insert or update on appointments
  for each row execute function enforce_appointment_slot_capacity();
