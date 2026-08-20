create extension if not exists pg_net with schema extensions;

create or replace function notify_new_appointment()
returns trigger as $$
declare
  ntfy_topic text := 'CutsBlushSalonAppointmentsNotification';
  msg text;
begin
  msg := coalesce(new.client_name, 'A customer') || ' wants ' || coalesce(new.service_name, 'a service')
    || ' on ' || to_char(new.appointment_date, 'DD Mon YYYY')
    || coalesce(' at ' || new.appointment_time, '')
    || '. Phone: ' || coalesce(new.phone, 'not given');

  perform net.http_post(
    url := 'https://ntfy.sh/',
    body := jsonb_build_object(
      'topic', ntfy_topic,
      'title', 'New appointment request',
      'message', msg,
      'priority', 4
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_new_appointment on appointments;
create trigger trg_notify_new_appointment
  after insert on appointments
  for each row
  execute function notify_new_appointment();
