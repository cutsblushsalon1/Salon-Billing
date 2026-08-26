create extension if not exists pg_net with schema extensions;

create or replace function notify_new_appointment()
returns trigger as $$
declare
  ntfy_topic text := 'CutsBlushSalonAppointmentsNotification';
  msg text;
begin
  msg := coalesce(new.client_name, 'A customer') || ' wants ' || coalesce(new.service_name, 'a service')
    || case when new.gender is not null then ' (for ' || new.gender || ')' else '' end
    || ' on ' || to_char(new.appointment_date, 'DD Mon YYYY')
    || coalesce(' at ' || new.appointment_time, '')
    || '. Phone: ' || coalesce(new.phone, 'not given');

  perform net.http_post(
    url := 'https://ntfy.sh/',
    body := jsonb_build_object(
      'topic', ntfy_topic,
      'title', 'New appointment request',
      'message', msg,
      'tags', jsonb_build_array('sparkles', 'scissors'),
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

-- To receive these on your phone: install the ntfy app (ntfy.sh, iOS/
-- Android) and subscribe to the topic above. Anyone who knows a public
-- ntfy.sh topic name can read/post to it, so if that matters to you,
-- rename `ntfy_topic` here to something private/unguessable (and re-run
-- this file), or self-host ntfy and change the url above to your own
-- server.
