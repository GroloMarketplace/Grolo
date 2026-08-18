-- Make store-follow notifications identify the actual person who followed.
alter table public.notifications add column if not exists actor_id uuid;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar text;

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
    actor_name, actor_avatar, subject_title, subject_image_url, store_image_url
  )
  select
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_id,
    p_actor_id,
    coalesce(actor.display_name, actor.username, actor.shop_name, metadata.display_name, metadata.full_name),
    actor.avatar_url,
    p_subject_title,
    p_subject_image_url,
    p_store_image_url
  from (select 1) as context
  left join public.profiles actor on actor.id = p_actor_id
  left join lateral (
    select
      u.raw_user_meta_data ->> 'display_name' as display_name,
      u.raw_user_meta_data ->> 'full_name' as full_name
    from auth.users u
    where u.id = p_actor_id
  ) metadata on true;
end;
$$;

revoke all on function public.create_activity_notification(uuid, text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.create_activity_notification(uuid, text, text, text, text, uuid, text, text, text) to authenticated;

create or replace function public.notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  seller uuid;
  follower_name text;
  store_avatar text;
begin
  if new.seller_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return new;
  end if;

  seller := new.seller_id::uuid;
  select avatar_url into store_avatar from public.profiles where id = seller;
  select coalesce(p.display_name, p.username, p.shop_name, u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name')
    into follower_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = new.follower_id;

  perform public.create_activity_notification(
    seller,
    'new_follower',
    'New follower',
    coalesce(follower_name, 'Someone') || ' started following your store.',
    new.follower_id::text,
    new.follower_id,
    null,
    null,
    store_avatar
  );
  return new;
end;
$$;

revoke all on function public.notify_new_follower() from public;
grant execute on function public.notify_new_follower() to authenticated;

update public.notifications n
set actor_name = coalesce(p.display_name, p.username, p.shop_name, u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', n.actor_name),
    actor_avatar = coalesce(p.avatar_url, n.actor_avatar),
    message = coalesce(
      coalesce(p.display_name, p.username, p.shop_name, u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', n.actor_name, 'Someone')
      || ' started following your store.',
      n.message
    )
from auth.users u
left join public.profiles p on p.id = u.id
where n.type = 'new_follower'
  and n.actor_id = u.id;

notify pgrst, 'reload schema';
