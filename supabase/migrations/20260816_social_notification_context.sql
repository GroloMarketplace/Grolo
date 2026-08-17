-- Add social context to durable notifications so the activity feed can render
-- the person, store, and listing involved in each event.
alter table public.notifications add column if not exists actor_id uuid references public.profiles(id) on delete set null;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar_url text;
alter table public.notifications add column if not exists subject_title text;
alter table public.notifications add column if not exists subject_image_url text;
alter table public.notifications add column if not exists store_image_url text;

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
  select
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_id,
    p_actor_id,
    coalesce(actor.display_name, actor.username, actor.shop_name),
    actor.avatar_url,
    p_subject_title,
    p_subject_image_url,
    p_store_image_url
  from (select 1) as context
  left join public.profiles actor on actor.id = p_actor_id;
end;
$$;

revoke all on function public.create_activity_notification(uuid, text, text, text, text, uuid, text, text, text) from public;
grant execute on function public.create_activity_notification(uuid, text, text, text, text, uuid, text, text, text) to authenticated;

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
declare seller uuid; store_avatar text;
begin
  if new.seller_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    seller := new.seller_id::uuid;
    select avatar_url into store_avatar from public.profiles where id = seller;
    perform public.create_activity_notification(seller, 'new_follower', 'New follower', 'Someone started following you.', new.follower_id::text, new.follower_id, null, null, store_avatar);
  end if;
  return new;
end;
$$;

create or replace function public.notify_listing_favorited()
returns trigger language plpgsql security definer set search_path = public as $$
declare seller uuid; listing_title text; listing_image text; store_avatar text;
begin
  select l.seller_id, coalesce(l.title, l.name, 'your listing'), l.image_urls->>0, p.avatar_url
    into seller, listing_title, listing_image, store_avatar
  from public.listings l left join public.profiles p on p.id = l.seller_id
  where l.id = new.listing_id;
  perform public.create_activity_notification(seller, 'listing_favorited', 'Listing favorited', 'Your listing "' || coalesce(listing_title, 'listing') || '" was favorited.', new.listing_id::text, new.user_id, listing_title, listing_image, store_avatar);
  return new;
end;
$$;

create or replace function public.notify_order_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare store_avatar text;
begin
  select avatar_url into store_avatar from public.profiles where id = new.seller_id;
  perform public.create_activity_notification(new.seller_id, 'order_received', 'Order received', 'You received a new order.', new.id::text, new.buyer_id, null, null, store_avatar);
  return new;
end;
$$;

create or replace function public.notify_review_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare seller uuid; listing_title text; listing_image text; store_avatar text;
begin
  select l.seller_id, coalesce(l.title, l.name, 'your listing'), l.image_urls->>0, p.avatar_url
    into seller, listing_title, listing_image, store_avatar
  from public.listings l left join public.profiles p on p.id = l.seller_id
  where l.id = new.listing_id;
  perform public.create_activity_notification(seller, 'review_received', 'Review received', 'You received a new review.', new.id::text, new.reviewer_id, listing_title, listing_image, store_avatar);
  return new;
end;
$$;

create or replace function public.notify_promotion_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid; store_avatar text; promotion_title text;
begin
  select avatar_url into store_avatar from public.profiles where id = new.seller_id;
  promotion_title := coalesce(new.title, 'New promotion');
  for follower in select case when seller_id ~* '^[0-9a-f-]{36}$' then seller_id::uuid end from public.user_follows where seller_id = new.seller_id::text
  loop
    perform public.create_activity_notification(follower, 'promotion_created', 'New promotion', 'A vendor you follow created a new promotion.', new.seller_id::text, new.seller_id, promotion_title, null, store_avatar);
  end loop;
  return new;
end;
$$;

create or replace function public.notify_new_listing_from_followed_vendor()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid; store_avatar text; listing_title text; listing_image text;
begin
  select coalesce(new.title, new.name, 'New listing'), new.image_urls->>0 into listing_title, listing_image;
  select avatar_url into store_avatar from public.profiles where id = new.seller_id;
  for follower in select case when seller_id ~* '^[0-9a-f-]{36}$' then seller_id::uuid end from public.user_follows where seller_id = new.seller_id::text
  loop
    perform public.create_activity_notification(follower, 'new_listing', 'New listing', 'A vendor you follow posted a new listing.', new.id::text, new.seller_id, listing_title, listing_image, store_avatar);
  end loop;
  return new;
end;
$$;

notify pgrst, 'reload schema';
