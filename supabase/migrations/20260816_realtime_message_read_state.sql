-- Realtime message delivery and durable per-message read state.
-- Explicit table grants are required in addition to RLS policies for the
-- recipient-side PostgREST queries to return conversation/message rows.
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

alter table public.messages add column if not exists read_at timestamptz;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('highlight', 'follower', 'new_follower', 'listing_favorited',
    'order_received', 'order_status', 'review_received', 'promotion_created',
    'new_listing', 'new_message'));

create or replace function public.mark_conversation_messages_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id
      and (buyer_id = auth.uid() or seller_id = auth.uid())
  ) then
    raise exception 'You are not a participant in this conversation.' using errcode = 'insufficient_privilege';
  end if;

  update public.messages
  set read_at = coalesce(read_at, now())
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.mark_conversation_messages_read(uuid) from public;
grant execute on function public.mark_conversation_messages_read(uuid) to authenticated;

-- This overload is repeated here because migration filenames with the same date
-- may be applied lexicographically before the social notification context migration.
create or replace function public.create_activity_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id text default null,
  p_actor_id uuid default null,
  p_subject_title text default null,
  p_subject_image_url text default null,
  p_store_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;
  insert into public.notifications (
    user_id, type, title, message, related_id, actor_id,
    actor_name, actor_avatar_url, subject_title, subject_image_url, store_image_url
  )
  select p_user_id, p_type, p_title, p_message, p_related_id, p_actor_id,
         coalesce(actor.display_name, actor.username, actor.shop_name), actor.avatar_url,
         p_subject_title, p_subject_image_url, p_store_image_url
  from (select 1) as context
  left join public.profiles actor on actor.id = p_actor_id;
end;
$$;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  listing_title text;
  listing_image text;
  store_avatar text;
begin
  select case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end,
         coalesce(l.title, l.name),
         l.image_urls->>0,
         seller_profile.avatar_url
    into recipient, listing_title, listing_image, store_avatar
  from public.conversations c
  left join public.listings l on l.id = c.listing_id
  left join public.profiles seller_profile on seller_profile.id = c.seller_id
  where c.id = new.conversation_id;

  perform public.create_activity_notification(
    recipient,
    'new_message',
    'New message',
    'Someone sent you a message.',
    new.conversation_id::text,
    new.sender_id,
    listing_title,
    listing_image,
    store_avatar
  );
  return new;
end;
$$;

drop trigger if exists notifications_on_message on public.messages;
create trigger notifications_on_message
after insert on public.messages
for each row execute function public.notify_new_message();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

notify pgrst, 'reload schema';
