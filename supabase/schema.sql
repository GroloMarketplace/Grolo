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
