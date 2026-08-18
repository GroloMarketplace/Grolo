-- Harden event attendance notifications for deployments where the original
-- attendance trigger was applied but did not resolve an attendee profile.
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
  event_row public.events%rowtype;
  attendee_name text;
  attendee_avatar text;
  event_key text := new.event_id;
begin
  select e.*
    into event_row
  from public.events e
  where e.id::text = new.event_id
     or e.legacy_id = new.event_id
  limit 1;

  if not found then
    raise warning 'event attendance notification skipped: event not found, event_id=%', new.event_id;
    return new;
  end if;

  if event_row.seller_id = new.user_id then
    return new;
  end if;

  select
    coalesce(p.display_name, p.username, p.shop_name, u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', 'Someone'),
    p.avatar_url
  into attendee_name, attendee_avatar
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new.user_id;

  if attendee_name is null then
    attendee_name := 'Someone';
  end if;

  insert into public.notifications (
    user_id, type, title, message, related_id,
    actor_id, actor_name, actor_avatar, subject_title
  )
  select
    event_row.seller_id,
    'event_attendance',
    'Event Attendance',
    attendee_name || ' is attending your event.',
    event_key,
    new.user_id,
    attendee_name,
    attendee_avatar,
    event_row.title
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = event_row.seller_id
      and n.type in ('event_attendance', 'event_rsvp')
      and n.related_id = event_key
      and n.actor_id = new.user_id
  );

  raise log 'event attendance notification processed: event_id=%, creator_id=%, attendee_id=%', event_key, event_row.seller_id, new.user_id;
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

drop trigger if exists event_attendance_notification on public.event_attendees;
create trigger event_attendance_notification
after insert on public.event_attendees
for each row execute function public.notify_event_attendance();

drop trigger if exists event_attendance_notification_cleanup on public.event_attendees;
create trigger event_attendance_notification_cleanup
after delete on public.event_attendees
for each row execute function public.remove_event_attendance_notification();

notify pgrst, 'reload schema';
