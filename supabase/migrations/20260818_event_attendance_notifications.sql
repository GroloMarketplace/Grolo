-- Notify event creators when another user attends or cancels attendance.
-- The event_attendees primary key prevents duplicate RSVP rows; the
-- notification checks below also make the notification idempotent.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'highlight', 'follower', 'new_follower', 'listing_favorited',
    'order_received', 'order_created', 'order_status', 'review_received',
    'promotion_created', 'new_listing', 'new_message', 'message_received',
    'event_attendance', 'event_rsvp'
  ));

create or replace function public.notify_event_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row record;
  attendee_name text;
  notification_type text := 'event_attendance';
begin
  select e.id, e.legacy_id, e.seller_id, e.title
    into event_row
  from public.events e
  where e.id::text = new.event_id
     or e.legacy_id = new.event_id
  limit 1;

  if event_row.seller_id is null or event_row.seller_id = new.user_id then
    return new;
  end if;

  select coalesce(p.display_name, p.username, p.shop_name, u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', 'Someone')
    into attendee_name
  from auth.users u
  left join public.profiles p on p.id = new.user_id
  where u.id = new.user_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    actor_id,
    actor_name,
    actor_avatar,
    subject_title
  )
  select
    event_row.seller_id,
    notification_type,
    'Event Attendance',
    attendee_name || ' is attending your event.',
    new.event_id,
    new.user_id,
    attendee_name,
    p.avatar_url,
    event_row.title
  from public.profiles p
  where p.id = new.user_id
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = event_row.seller_id
        and n.type = notification_type
        and n.related_id = new.event_id
        and n.actor_id = new.user_id
    );

  return new;
end;
$$;

create or replace function public.remove_event_attendance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_id uuid;
begin
  select e.seller_id
    into creator_id
  from public.events e
  where e.id::text = old.event_id
     or e.legacy_id = old.event_id
  limit 1;

  delete from public.notifications n
  where n.user_id = creator_id
    and n.type in ('event_attendance', 'event_rsvp')
    and n.related_id = old.event_id
    and n.actor_id = old.user_id;

  return old;
end;
$$;

revoke all on function public.notify_event_attendance() from public;
revoke all on function public.remove_event_attendance_notification() from public;
grant execute on function public.notify_event_attendance() to authenticated;
grant execute on function public.remove_event_attendance_notification() to authenticated;

drop trigger if exists event_attendance_notification on public.event_attendees;
create trigger event_attendance_notification
after insert on public.event_attendees
for each row execute function public.notify_event_attendance();

drop trigger if exists event_attendance_notification_cleanup on public.event_attendees;
create trigger event_attendance_notification_cleanup
after delete on public.event_attendees
for each row execute function public.remove_event_attendance_notification();

create index if not exists notifications_event_attendance_dedupe_idx
  on public.notifications (user_id, type, related_id, actor_id);

notify pgrst, 'reload schema';
