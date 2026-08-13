-- My Shop App — Supabase schema
-- Run in the Supabase SQL editor to provision auth-linked tables, RLS policies,
-- and full-text search for listings.

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users, one row per user / shop owner)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_name text,
  shop_slug text unique,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists username text unique;
alter table profiles add column if not exists banner_url text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists location_radius numeric not null default 25;
alter table profiles add column if not exists latitude double precision;
alter table profiles add column if not exists longitude double precision;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists province text;
alter table profiles add column if not exists location_permission text not null default 'unknown';
alter table profiles add column if not exists interests jsonb not null default '[]'::jsonb;
alter table profiles add column if not exists buyer_notifications jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists seller_notifications jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists show_location_publicly boolean not null default false;
alter table profiles add column if not exists store_description text;
alter table profiles add column if not exists store_location text;
alter table profiles add column if not exists vacation_mode boolean not null default false;
alter table profiles add column if not exists vacation_message text;
alter table profiles add column if not exists return_date text;
alter table profiles add column if not exists social_links text;
alter table profiles add column if not exists seller_status text not null default 'buyer';
alter table profiles add column if not exists store_onboarding_status boolean not null default false;
alter table profiles add column if not exists store_opened_at timestamptz;
alter table profiles add column if not exists onboarding_completed boolean not null default false;

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Store follows. The composite key prevents duplicate follows.
create table if not exists user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  seller_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, seller_id)
);

alter table user_follows enable row level security;

create policy "Follows are viewable by everyone"
  on user_follows for select using (true);

create policy "Users can manage their own follows"
  on user_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- Event attendance. The composite key guarantees one attendance record per user/event.
create table if not exists event_attendees (
  event_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table event_attendees enable row level security;

create policy "Event attendance is viewable by everyone"
  on event_attendees for select using (true);

create policy "Users can manage their own event attendance"
  on event_attendees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text
);

alter table categories enable row level security;
create policy "Categories are viewable by everyone"
  on categories for select using (true);

-- Listings
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  legacy_id text unique,
  title text,
  name text not null,
  description text,
  category text references categories(name),
  subcategory text,
  price numeric(10, 2) not null default 0,
  pricing_details text,
  condition text,
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  trade_enabled boolean not null default false,
  pickup_available boolean not null default true,
  delivery_available boolean not null default false,
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  location text,
  status text not null default 'Active',
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, name, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table listings add column if not exists legacy_id text unique;
alter table listings add column if not exists title text;
alter table listings add column if not exists subcategory text;
alter table listings add column if not exists pricing_details text;
alter table listings add column if not exists condition text;
alter table listings add column if not exists inventory_quantity integer not null default 0;
alter table listings add column if not exists trade_enabled boolean not null default false;
alter table listings add column if not exists pickup_available boolean not null default true;
alter table listings add column if not exists delivery_available boolean not null default false;
alter table listings add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table listings add column if not exists location text;
alter table listings add column if not exists status text not null default 'Active';
alter table listings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table listings add column if not exists updated_at timestamptz not null default now();

create index if not exists listings_search_idx on listings using gin(search_vector);
create index if not exists listings_seller_idx on listings (seller_id);
create index if not exists listings_status_idx on listings (status);

alter table listings enable row level security;

create policy "Listings are viewable by everyone"
  on listings for select using (true);

create policy "Sellers can manage their own listings"
  on listings for all using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Favorites
create table if not exists favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select using (auth.uid() = user_id);

create policy "Users can manage their own favorites"
  on favorites for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reviews
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on reviews for select using (true);

create policy "Users can manage their own reviews"
  on reviews for all using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

-- Conversations (1:1 between a buyer and a seller)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (buyer_id, seller_id, listing_id)
);

alter table conversations enable row level security;

create policy "Participants can view their conversations"
  on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Participants can create conversations"
  on conversations for insert
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Participants can view messages"
  on messages for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Comments and nested replies
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  parent_comment_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table comments enable row level security;
create policy "Users can view comments" on comments for select using (true);
create policy "Users can create their own comments" on comments for insert with check (auth.uid() = author_id);

create table if not exists comment_likes (
  comment_id text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table comment_likes enable row level security;
create policy "Users can view comment likes" on comment_likes for select using (true);
create policy "Users can manage their comment likes" on comment_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_user_id text,
  actor_username text,
  actor_name text,
  actor_avatar_url text,
  type text not null check (type in ('highlight', 'follower')),
  action text not null,
  quote text,
  thumbnail_url text,
  post_id text,
  comment_id text,
  reply_id text,
  notification_type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications add column if not exists actor_user_id text;
alter table notifications add column if not exists actor_username text;
alter table notifications add column if not exists post_id text;
alter table notifications add column if not exists comment_id text;
alter table notifications add column if not exists reply_id text;
alter table notifications add column if not exists notification_type text;
create unique index if not exists notifications_comment_like_unique
  on notifications (recipient_id, actor_user_id, comment_id, notification_type)
  where notification_type = 'comment_like';

alter table notifications enable row level security;

create policy "Users can view their own notifications"
  on notifications for select using (auth.uid() = recipient_id);

create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = recipient_id);

-- Durable user-generated images. Public reads allow image URLs to render for other users;
-- writes and replacements are restricted to the owning user's folder.
insert into storage.buckets (id, name, public)
values ('grolo-images', 'grolo-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Grolo users can upload own images" on storage.objects;
create policy "Grolo users can upload own images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'grolo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Grolo users can update own images" on storage.objects;
create policy "Grolo users can update own images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'grolo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'grolo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Grolo users can delete own images" on storage.objects;
create policy "Grolo users can delete own images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'grolo-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Orders (Phase 5E.1). Order persistence is provisioned independently of the
-- current localStorage-backed OrderContext so the UI can migrate later.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete restrict,
  fulfillment_method text not null default 'pickup' check (fulfillment_method in ('pickup', 'delivery')),
  status text not null default 'Seller Notified',
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  inventory_restored boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, listing_id)
);

create index if not exists orders_buyer_idx on orders (buyer_id);
create index if not exists orders_seller_idx on orders (seller_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_listing_idx on order_items (listing_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

drop trigger if exists order_items_set_updated_at on order_items;
create trigger order_items_set_updated_at
before update on order_items
for each row execute function set_updated_at();

alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "Buyers can read their own orders" on orders;
create policy "Buyers can read their own orders"
  on orders for select to authenticated
  using (auth.uid() = buyer_id);

drop policy if exists "Sellers can read orders containing their listings" on orders;
create policy "Sellers can read orders containing their listings"
  on orders for select to authenticated
  using (auth.uid() = seller_id);

drop policy if exists "Buyers can create their own orders" on orders;
create policy "Buyers can create their own orders"
  on orders for insert to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "Buyers can read items in their orders" on order_items;
create policy "Buyers can read items in their orders"
  on order_items for select to authenticated
  using (
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

drop policy if exists "Sellers can read items for their listings" on order_items;
create policy "Sellers can read items for their listings"
  on order_items for select to authenticated
  using (
    exists (
      select 1
      from listings
      where listings.id = order_items.listing_id
        and listings.seller_id = auth.uid()
    )
  );

drop policy if exists "Buyers can create items in their orders" on order_items;
create policy "Buyers can create items in their orders"
  on order_items for insert to authenticated
  with check (
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.buyer_id = auth.uid()
    )
  );

-- Phase 5E.3.1 authorization and atomic operation preparation.
-- Direct order inserts and order-item inserts are disabled. Order creation must
-- use create_order_with_items so the order and its items commit together.
drop policy if exists "Buyers can create their own orders" on orders;
drop policy if exists "Buyers can create items in their orders" on order_items;
revoke insert on orders from authenticated;
revoke insert on order_items from authenticated;

drop policy if exists "Sellers can update their own order statuses" on orders;
create policy "Sellers can update their own order statuses"
  on orders for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Only the cancellation function may perform a buyer cancellation. The
-- function checks auth.uid() against buyer_id and locks the order before work.
-- Dropping the old buyer update policy prevents a direct status update from
-- bypassing inventory restoration.
drop policy if exists "Buyers can cancel their own eligible orders" on orders;

create or replace function protect_order_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.subtotal is distinct from old.subtotal
    or new.delivery_fee is distinct from old.delivery_fee
    or new.total is distinct from old.total
    or new.fulfillment_method is distinct from old.fulfillment_method
    or new.created_at is distinct from old.created_at
    or new.metadata is distinct from old.metadata
  then
    raise exception 'Order ownership, fulfillment, totals, and metadata are immutable after creation.'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status
    and new.status = 'Cancelled'
    and current_user = session_user
  then
    raise exception 'Orders can only be cancelled by the buyer cancellation operation.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.inventory_restored is distinct from old.inventory_restored
    and current_user = session_user
  then
    raise exception 'inventory_restored can only be changed by the cancellation operation.'
      using errcode = 'insufficient_privilege';
  end if;

  if old.inventory_restored and not new.inventory_restored then
    raise exception 'inventory_restored cannot be reset.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_order_immutable_fields_trigger on orders;
create trigger protect_order_immutable_fields_trigger
before update on orders
for each row execute function protect_order_immutable_fields();

create or replace function prevent_order_item_updates()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Order items are immutable after creation.'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists prevent_order_item_updates_trigger on order_items;
create trigger prevent_order_item_updates_trigger
before update or delete on order_items
for each row execute function prevent_order_item_updates();

-- Atomically creates one order, reserves inventory, and creates all line
-- items. The buyer and prices are taken from the authenticated session and the
-- listings table; callers cannot supply either value.
create or replace function create_order_with_items(
  p_seller_id uuid,
  p_fulfillment_method text default 'pickup',
  p_delivery_fee numeric default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_item jsonb;
  v_listing listings;
  v_listing_id uuid;
  v_legacy_order_id text;
  v_quantity integer;
  v_unit_price numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_delivery_fee numeric(10, 2) := coalesce(p_delivery_fee, 0);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_seller_id is null or not exists (select 1 from profiles where id = p_seller_id) then
    raise exception 'Seller profile not found.' using errcode = 'foreign_key_violation';
  end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception 'Fulfillment method is invalid.' using errcode = 'check_violation';
  end if;
  if v_delivery_fee < 0 then
    raise exception 'Delivery fee cannot be negative.' using errcode = 'check_violation';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required.' using errcode = 'check_violation';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item->>'listing_id'
    having count(*) > 1
  ) then
    raise exception 'Each listing may appear only once in an order.' using errcode = 'unique_violation';
  end if;

  v_legacy_order_id := nullif(p_metadata->>'legacy_order_id', '');
  if v_legacy_order_id is not null then
    select * into v_order
    from orders
    where buyer_id = auth.uid()
      and metadata->>'legacy_order_id' = v_legacy_order_id
    for update;
    if found then
      return jsonb_build_object(
        'order', to_jsonb(v_order),
        'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
        from order_items item
        join listings listing on listing.id = item.listing_id
        where item.order_id = v_order.id), '[]'::jsonb)
      );
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Order item quantity is invalid.' using errcode = 'check_violation';
    end if;

    if (v_item->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_listing_id := (v_item->>'listing_id')::uuid;
      select * into v_listing
      from listings
      where id = v_listing_id
        and seller_id = p_seller_id
        and status = 'Active'
      for update;
    else
      select * into v_listing
      from listings
      where legacy_id = v_item->>'listing_id'
        and seller_id = p_seller_id
        and status = 'Active'
      for update;
      v_listing_id := v_listing.id;
    end if;
    if not found then
      raise exception 'Order item listing is not owned by the selected seller or is unavailable.'
        using errcode = 'foreign_key_violation';
    end if;
    if v_listing.inventory_quantity < v_quantity then
      raise exception 'Insufficient inventory for listing %.', v_listing.id
        using errcode = 'check_violation';
    end if;

    v_subtotal := v_subtotal + (v_quantity * v_listing.price);
    update listings
    set inventory_quantity = inventory_quantity - v_quantity,
        updated_at = now()
    where id = v_listing.id;
  end loop;

  insert into orders (
    buyer_id, seller_id, fulfillment_method, status,
    subtotal, delivery_fee, total, metadata
  ) values (
    auth.uid(), p_seller_id, p_fulfillment_method, 'Seller Notified',
    v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if (v_item->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_listing_id := (v_item->>'listing_id')::uuid;
    else
      select id into v_listing_id from listings
      where legacy_id = v_item->>'listing_id';
    end if;
    select price into v_unit_price from listings where id = v_listing_id;
    insert into order_items (order_id, listing_id, quantity, unit_price, line_total)
    values (
      v_order.id,
      v_listing_id,
      (v_item->>'quantity')::integer,
      v_unit_price,
      (v_item->>'quantity')::integer * v_unit_price
    );
  end loop;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
        from order_items item
        join listings listing on listing.id = item.listing_id
        where item.order_id = v_order.id), '[]'::jsonb)
  );
end;
$$;

revoke execute on function create_order_with_items(uuid, text, numeric, jsonb, jsonb) from public;
grant execute on function create_order_with_items(uuid, text, numeric, jsonb, jsonb) to authenticated;

-- Atomically cancels an eligible buyer order, restores every line item's
-- inventory, and marks inventory_restored. The order lock makes the operation
-- idempotent under concurrent cancellation requests.
create or replace function cancel_order_with_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_item record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
  for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;
  if v_order.buyer_id <> auth.uid() then
    raise exception 'Only the buyer can cancel this order.' using errcode = 'insufficient_privilege';
  end if;
  if v_order.status = 'Cancelled' and v_order.inventory_restored then
    return jsonb_build_object(
      'order', to_jsonb(v_order),
      'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
        from order_items item
        join listings listing on listing.id = item.listing_id
        where item.order_id = v_order.id), '[]'::jsonb),
      'inventory_already_restored', true
    );
  end if;
  if v_order.status not in ('Order Placed', 'Seller Notified') then
    raise exception 'This order can no longer be cancelled.' using errcode = 'check_violation';
  end if;

  for v_item in
    select listing_id, quantity
    from order_items
    where order_id = v_order.id
    for update
  loop
    update listings
    set inventory_quantity = inventory_quantity + v_item.quantity,
        updated_at = now()
    where id = v_item.listing_id;
  end loop;

  update orders
  set status = 'Cancelled', inventory_restored = true, updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
        from order_items item
        join listings listing on listing.id = item.listing_id
        where item.order_id = v_order.id), '[]'::jsonb),
    'inventory_restored', true
  );
end;
$$;

revoke execute on function cancel_order_with_inventory(uuid) from public;
grant execute on function cancel_order_with_inventory(uuid) to authenticated;

-- Phase 5E.3.4 deterministic local-order import protection.
create unique index if not exists orders_legacy_import_idx
  on orders (buyer_id, (metadata->>'legacy_order_id'))
  where metadata ? 'legacy_order_id';

-- Imports legacy orders for the authenticated buyer only. Listing IDs may be
-- either listings.id UUIDs or listings.legacy_id values. Inventory is not
-- changed because legacy order creation already handled local inventory.
create or replace function import_legacy_orders(p_orders jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_legacy_order jsonb;
  v_legacy_order_id text;
  v_product_id text;
  v_listing listings;
  v_quantity integer;
  v_total numeric(10, 2);
  v_delivery_fee numeric(10, 2);
  v_subtotal numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_created_at timestamptz;
  v_inventory_restored boolean;
  v_imported integer := 0;
  v_skipped integer := 0;
  v_duplicates integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    raise exception 'Legacy orders must be a JSON array.' using errcode = 'check_violation';
  end if;

  for v_legacy_order in select value from jsonb_array_elements(p_orders)
  loop
    v_legacy_order_id := nullif(v_legacy_order->>'id', '');
    if v_legacy_order_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if exists (
      select 1
      from orders
      where buyer_id = auth.uid()
        and metadata->>'legacy_order_id' = v_legacy_order_id
    ) then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    v_product_id := nullif(v_legacy_order->>'productId', '');
    if v_product_id is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      select * into v_listing
      from listings
      where id = v_product_id::uuid;
    else
      select * into v_listing
      from listings
      where legacy_id = v_product_id;
    end if;
    if not found then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if coalesce(v_legacy_order->>'quantity', '') !~ '^[0-9]+$' then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_quantity := (v_legacy_order->>'quantity')::integer;
    if v_quantity <= 0 then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_unit_price := v_listing.price;
    v_delivery_fee := greatest(coalesce((v_legacy_order->>'deliveryFee')::numeric, 0), 0);
    v_total := greatest(coalesce((v_legacy_order->>'total')::numeric, v_unit_price * v_quantity + v_delivery_fee), 0);
    v_subtotal := greatest(v_total - v_delivery_fee, 0);
    v_inventory_restored := coalesce((v_legacy_order->>'inventoryRestored')::boolean, false);
    v_created_at := case
      when (v_legacy_order->>'createdAt') ~ '^[0-9]+$'
        then to_timestamp((v_legacy_order->>'createdAt')::numeric / 1000)
      else coalesce((v_legacy_order->>'createdAt')::timestamptz, now())
    end;

    insert into orders (
      buyer_id, seller_id, fulfillment_method, status,
      subtotal, delivery_fee, total, inventory_restored, metadata, created_at, updated_at
    ) values (
      auth.uid(),
      v_listing.seller_id,
      case when v_legacy_order->>'fulfillmentMethod' in ('pickup', 'delivery')
        then v_legacy_order->>'fulfillmentMethod' else 'pickup' end,
      coalesce(nullif(v_legacy_order->>'status', ''), 'Seller Notified'),
      v_subtotal,
      v_delivery_fee,
      v_total,
      v_inventory_restored,
      coalesce(v_legacy_order->'metadata', '{}'::jsonb)
        || jsonb_build_object(
          'legacy_order_id', v_legacy_order_id,
          'legacy_source', 'localStorage',
          'buyer', v_legacy_order->>'buyer',
          'buyerAvatar', v_legacy_order->>'buyerAvatar'
        ),
      v_created_at,
      v_created_at
    );

    insert into order_items (order_id, listing_id, quantity, unit_price, line_total)
    select id, v_listing.id, v_quantity, v_unit_price, v_subtotal
    from orders
    where buyer_id = auth.uid()
      and metadata->>'legacy_order_id' = v_legacy_order_id;

    v_imported := v_imported + 1;
  end loop;

  return jsonb_build_object(
    'imported_count', v_imported,
    'skipped_count', v_skipped,
    'duplicate_count', v_duplicates
  );
end;
$$;

revoke execute on function import_legacy_orders(jsonb) from public;
grant execute on function import_legacy_orders(jsonb) to authenticated;

-- Migration plan:
-- 1. Apply this SQL after the Phase 5E.1 orders schema exists.
-- 2. The authenticated OrderContext startup reads grolo-orders-{userId}, calls
--    import_legacy_orders once, and writes grolo-orders-migrated-{userId} only
--    after the RPC succeeds.
-- 3. Verify legacy_id and UUID listing resolution, deterministic duplicates,
--    imported totals/dates/items, and imported/skipped/duplicate counts.
-- 4. Keep localStorage intact for the dual-read fallback; removal is deferred.
