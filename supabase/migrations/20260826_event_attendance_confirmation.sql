-- Track whether an RSVP became confirmed attendance or a no-show.
alter table public.event_attendees
  add column if not exists attendance_status text not null default 'rsvpd';

alter table public.event_attendees drop constraint if exists event_attendees_attendance_status_check;
alter table public.event_attendees
  add constraint event_attendees_attendance_status_check
  check (attendance_status in ('rsvpd', 'confirmed_attended', 'no_show'));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'highlight', 'follower', 'new_follower', 'listing_favorited',
    'order_received', 'order_created', 'order_status', 'order_preparing',
    'order_ready_for_pickup', 'order_completed', 'review_received',
    'promotion_created', 'new_listing', 'new_message', 'message_received',
    'event_attendance', 'event_rsvp', 'event_attendance_confirmation',
    'trade_proposal'
  ));

create or replace function public.create_event_attendance_confirmation_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, message, related_id)
  select
    ea.user_id,
    'event_attendance_confirmation',
    'Did you attend this event?',
    e.title || E'\n\nYour attendance helps keep community participation accurate.',
    coalesce(e.legacy_id, e.id::text)
  from public.event_attendees ea
  join public.events e
    on e.id::text = ea.event_id
    or e.legacy_id = ea.event_id
  where ea.user_id = auth.uid()
    and ea.attendance_status = 'rsvpd'
    and (
      e.date + coalesce(e.end_time, e.start_time, '23:59:59'::time)
    ) < now()
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = ea.user_id
        and n.type = 'event_attendance_confirmation'
        and n.related_id = coalesce(e.legacy_id, e.id::text)
    );
$$;

create or replace function public.respond_to_event_attendance_confirmation(
  p_event_id text,
  p_attended boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text := case when p_attended then 'confirmed_attended' else 'no_show' end;
  updated_status text;
begin
  update public.event_attendees ea
  set attendance_status = next_status
  from public.events e
  where ea.user_id = auth.uid()
    and ea.event_id = p_event_id
    and ea.attendance_status = 'rsvpd'
    and (e.id::text = ea.event_id or e.legacy_id = ea.event_id)
    and (e.date + coalesce(e.end_time, e.start_time, '23:59:59'::time)) < now()
  returning ea.attendance_status into updated_status;

  return updated_status;
end;
$$;

revoke all on function public.create_event_attendance_confirmation_notifications() from public;
grant execute on function public.create_event_attendance_confirmation_notifications() to authenticated;
revoke all on function public.respond_to_event_attendance_confirmation(text, boolean) from public;
grant execute on function public.respond_to_event_attendance_confirmation(text, boolean) to authenticated;

notify pgrst, 'reload schema';
