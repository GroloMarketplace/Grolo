-- Phase 8H: durable notifications and database-generated activity events.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_id text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists related_id text;
alter table public.notifications add column if not exists read boolean not null default false;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

-- Migrate the legacy recipient column before notification functions insert rows.
-- Keep it nullable for backward compatibility; user_id is authoritative.
do $$
declare
  has_recipient_id boolean;
  has_null_user_id boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'recipient_id'
  ) into has_recipient_id;

  if has_recipient_id then
    execute $sql$
      update public.notifications
      set user_id = coalesce(
        user_id,
        case
          when recipient_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            then recipient_id::uuid
          else null
        end
      )
      where user_id is null
        and recipient_id is not null
    $sql$;
    execute 'alter table public.notifications alter column recipient_id drop not null';
  end if;

  select exists (
    select 1 from public.notifications where user_id is null
  ) into has_null_user_id;
  if has_null_user_id then
    raise exception 'Cannot make notifications.user_id NOT NULL: existing rows have no valid recipient';
  end if;
  alter table public.notifications alter column user_id set not null;
end;
$$;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, read) where read = false;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

alter table public.notifications enable row level security;
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only trusted database functions create notifications. This keeps event creation
-- consistent regardless of which client or RPC writes the source record.
revoke insert, delete on public.notifications from anon, authenticated;

create or replace function public.create_activity_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_related_id text default null
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
  insert into public.notifications (user_id, type, title, message, related_id)
  values (p_user_id, p_type, p_title, p_message, p_related_id);
end;
$$;

revoke all on function public.create_activity_notification(uuid, text, text, text, text) from public;
grant execute on function public.create_activity_notification(uuid, text, text, text, text) to authenticated;

create or replace function public.notify_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.seller_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    perform public.create_activity_notification(new.seller_id::uuid, 'new_follower', 'New follower', 'Someone started following you.', new.follower_id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_on_follow on public.user_follows;
create trigger notifications_on_follow after insert on public.user_follows
for each row execute function public.notify_new_follower();

create or replace function public.notify_listing_favorited()
returns trigger language plpgsql security definer set search_path = public as $$
declare seller uuid; listing_title text;
begin
  select l.seller_id, coalesce(l.title, l.name, 'your listing') into seller, listing_title from public.listings l where l.id = new.listing_id;
  perform public.create_activity_notification(seller, 'listing_favorited', 'Listing favorited', 'Your listing "' || coalesce(listing_title, 'listing') || '" was favorited.', new.listing_id::text);
  return new;
end;
$$;

drop trigger if exists notifications_on_favorite on public.favorites;
create trigger notifications_on_favorite after insert on public.favorites
for each row execute function public.notify_listing_favorited();

create or replace function public.notify_order_received()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.create_activity_notification(new.seller_id, 'order_received', 'Order received', 'You received a new order.', new.id::text);
  return new;
end;
$$;

drop trigger if exists notifications_on_order on public.orders;
create trigger notifications_on_order after insert on public.orders
for each row execute function public.notify_order_received();

create or replace function public.notify_review_received()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seller uuid;
begin
  select seller_id into seller
  from public.listings
  where id = new.listing_id;
  perform public.create_activity_notification(seller, 'review_received', 'Review received', 'You received a new review.', new.id::text);
  return new;
end;
$$;

drop trigger if exists notifications_on_review on public.reviews;
create trigger notifications_on_review after insert on public.reviews
for each row execute function public.notify_review_received();

create or replace function public.notify_promotion_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid;
begin
  for follower in select case when seller_id ~* '^[0-9a-f-]{36}$' then seller_id::uuid end from public.user_follows
    where seller_id = new.seller_id::text
  loop
    perform public.create_activity_notification(follower, 'promotion_created', 'New promotion', 'A vendor you follow created a new promotion.', new.seller_id::text);
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_on_promotion on public.promotions;
create trigger notifications_on_promotion after insert on public.promotions
for each row execute function public.notify_promotion_created();

create or replace function public.notify_new_listing_from_followed_vendor()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower uuid;
begin
  for follower in select case when seller_id ~* '^[0-9a-f-]{36}$' then seller_id::uuid end from public.user_follows
    where seller_id = new.seller_id::text
  loop
    perform public.create_activity_notification(follower, 'new_listing', 'New listing', 'A vendor you follow posted a new listing.', new.id::text);
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_on_listing on public.listings;
create trigger notifications_on_listing after insert on public.listings
for each row execute function public.notify_new_listing_from_followed_vendor();

notify pgrst, 'reload schema';
