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
alter table profiles add column if not exists neighborhood text;
alter table profiles add column if not exists country text;
alter table profiles add column if not exists postal_code text;
alter table profiles add column if not exists store_neighborhood text;
alter table profiles add column if not exists store_city text;
alter table profiles add column if not exists store_province text;
alter table profiles add column if not exists store_country text;
alter table profiles add column if not exists store_postal_code text;
alter table profiles add column if not exists store_latitude double precision;
alter table profiles add column if not exists store_longitude double precision;
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

-- Store follows. seller_id is the authoritative application key. The later
-- engagement migration adds nullable vendor_id only for legacy compatibility.
create table if not exists user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  seller_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_follows_follower_seller_idx
  on user_follows (follower_id, seller_id);

alter table user_follows enable row level security;

create policy "Follows are viewable by everyone"
  on user_follows for select using (true);

create policy "Users can manage their own follows"
  on user_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);

-- Events. The owner is a real profile so events resolve across devices.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  legacy_id text unique,
  title text not null,
  type text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  description text not null,
  image_url text,
  capacity integer check (capacity is null or capacity >= 0),
  visibility text not null default 'public',
  likes integer not null default 0,
  comments integer not null default 0,
  reposts integer not null default 0,
  shares integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table events add column if not exists legacy_id text unique;
alter table events add column if not exists image_url text;
alter table events add column if not exists neighborhood text;
alter table events add column if not exists city text;
alter table events add column if not exists province text;
alter table events add column if not exists country text;
alter table events add column if not exists postal_code text;
alter table events add column if not exists latitude double precision;
alter table events add column if not exists longitude double precision;
alter table events add column if not exists capacity integer;
alter table events add column if not exists visibility text not null default 'public';
alter table events add column if not exists likes integer not null default 0;
alter table events add column if not exists comments integer not null default 0;
alter table events add column if not exists reposts integer not null default 0;
alter table events add column if not exists shares integer not null default 0;
alter table events add column if not exists updated_at timestamptz not null default now();

create index if not exists events_seller_idx on events (seller_id);
create index if not exists events_date_idx on events (date);

alter table events enable row level security;
create policy "Events are viewable by everyone"
  on events for select using (true);
create policy "Sellers can manage their own events"
  on events for all using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- Promotions are owned by real seller profiles and loaded on every session.
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  listing_id text,
  listing_ids jsonb not null default '[]'::jsonb,
  title text not null,
  description text not null default '',
  promotion_type text not null default 'percentage',
  discount_type text not null default 'percentage',
  discount_value numeric(10, 2),
  start_date date not null default current_date,
  end_date date,
  status text not null default 'active',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table promotions add column if not exists listing_ids jsonb not null default '[]'::jsonb;
alter table promotions add column if not exists description text not null default '';
alter table promotions add column if not exists promotion_type text not null default 'percentage';
alter table promotions add column if not exists discount_type text not null default 'percentage';
alter table promotions add column if not exists image_url text;
alter table promotions add column if not exists updated_at timestamptz not null default now();
create index if not exists promotions_seller_idx on promotions (seller_id);
create index if not exists promotions_dates_idx on promotions (start_date, end_date);
alter table promotions enable row level security;
drop policy if exists "Promotions are viewable by everyone" on promotions;
create policy "Promotions are viewable by everyone"
  on promotions for select using (true);
drop policy if exists "Sellers can manage their own promotions" on promotions;
create policy "Sellers can manage their own promotions"
  on promotions for all using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

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
alter table listings add column if not exists neighborhood text;
alter table listings add column if not exists city text;
alter table listings add column if not exists province text;
alter table listings add column if not exists country text;
alter table listings add column if not exists postal_code text;
alter table listings add column if not exists latitude double precision;
alter table listings add column if not exists longitude double precision;
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
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table favorites add column if not exists id uuid default gen_random_uuid();

alter table favorites enable row level security;

create policy "Users can view their own favorites"
  on favorites for select using (auth.uid() = user_id);

create policy "Users can manage their own favorites"
  on favorites for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reviews
-- Product review: a buyer reviews a listing/order item after a completed order.
-- Seller review: a buyer reviews the seller after a completed order.
-- Buyer review: a seller reviews the buyer after a completed order.
--
-- Order and order-item foreign keys are added below after those tables are
-- provisioned, keeping this schema migration-safe for existing databases.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  review_type text not null default 'product',
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  order_id uuid,
  order_item_id uuid,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  criteria jsonb not null default '{}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint reviews_review_type_check
    check (review_type in ('product', 'seller', 'buyer')),
  constraint reviews_criteria_object_check
    check (jsonb_typeof(criteria) = 'object'),
  constraint reviews_photos_array_check
    check (jsonb_typeof(photos) = 'array'),
  constraint reviews_status_check
    check (status in ('draft', 'published', 'hidden', 'removed'))
);

alter table reviews add column if not exists review_type text not null default 'product';
alter table reviews add column if not exists reviewee_id uuid;
alter table reviews add column if not exists order_id uuid;
alter table reviews add column if not exists order_item_id uuid;
alter table reviews add column if not exists criteria jsonb not null default '{}'::jsonb;
alter table reviews add column if not exists photos jsonb not null default '[]'::jsonb;
alter table reviews add column if not exists status text not null default 'published';
alter table reviews add column if not exists updated_at timestamptz not null default now();
alter table reviews add column if not exists published_at timestamptz;
alter table reviews add column if not exists deleted_at timestamptz;
alter table reviews alter column listing_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_review_type_check'
  ) then
    alter table reviews add constraint reviews_review_type_check
      check (review_type in ('product', 'seller', 'buyer'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_criteria_object_check'
  ) then
    alter table reviews add constraint reviews_criteria_object_check
      check (jsonb_typeof(criteria) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_photos_array_check'
  ) then
    alter table reviews add constraint reviews_photos_array_check
      check (jsonb_typeof(photos) = 'array');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_status_check'
  ) then
    alter table reviews add constraint reviews_status_check
      check (status in ('draft', 'published', 'hidden', 'removed'));
  end if;
end;
$$;

alter table reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on reviews;
create policy "Reviews are viewable by everyone"
  on reviews for select using (status = 'published' and deleted_at is null);

drop policy if exists "Users can manage their own reviews" on reviews;
drop policy if exists "Users can update their own review content" on reviews;
create policy "Users can update their own review content"
  on reviews for update to authenticated
  using (auth.uid() = reviewer_id)
  with check (auth.uid() = reviewer_id);

-- Client inserts and deletes are disabled. Review creation must go through
-- create_review(), which derives and validates ownership from auth.uid().
revoke insert, delete on reviews from public;

-- Conversations (buyer/seller conversation container).
-- order_id is added as a UUID here and receives its foreign key after the
-- orders table is provisioned below because orders is declared later in this
-- schema file.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  conversation_type text not null default 'standard',
  order_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  preview text not null default '',
  updated_at timestamptz not null default now(),
  constraint conversations_type_check
    check (conversation_type in ('standard', 'service', 'order', 'trading', 'trade_proposal'))
);

alter table conversations add column if not exists conversation_type text not null default 'standard';
alter table conversations add column if not exists order_id uuid;
alter table conversations add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table conversations add column if not exists created_at timestamptz not null default now();
alter table conversations add column if not exists preview text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and conname = 'conversations_type_check'
  ) then
    alter table conversations
      add constraint conversations_type_check
      check (conversation_type in ('standard', 'service', 'order', 'trading', 'trade_proposal'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and conname = 'conversations_metadata_object_check'
  ) then
    alter table conversations
      add constraint conversations_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
end;
$$;

alter table conversations enable row level security;

-- A conversation is created on behalf of its buyer. This prevents either
-- participant from assigning an unrelated account to the other side.
drop policy if exists "Participants can view their conversations" on conversations;
create policy "Participants can view their conversations"
  on conversations for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Participants can create conversations" on conversations;
drop policy if exists "Buyers can create conversations" on conversations;
create policy "Buyers can create conversations"
  on conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and (
      listing_id is null
      or exists (
        select 1 from listings l
        where l.id = listing_id and l.seller_id = seller_id
      )
    )
  );

drop policy if exists "Participants can update conversations" on conversations;
create policy "Participants can update conversations"
  on conversations for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
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

drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages"
  on messages for select to authenticated using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages"
  on messages for insert to authenticated with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Participants can update messages" on messages;
drop policy if exists "Participants can delete messages" on messages;

-- Participant identity and message ownership are immutable. Conversation
-- preview and updated_at are maintained by the message/conversation triggers.
create or replace function protect_conversation_fields()
returns trigger
language plpgsql
as $$
begin
  if new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.listing_id is distinct from old.listing_id
    or new.order_id is distinct from old.order_id
    or new.conversation_type is distinct from old.conversation_type
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Conversation participants and identity fields are immutable.'
      using errcode = 'insufficient_privilege';
  end if;
  new.preview := coalesce((
    select m.content
    from messages m
    where m.conversation_id = new.id
    order by m.created_at desc, m.id desc
    limit 1
  ), '');
  new.updated_at := now();
  return new;
end;
$$;

create or replace function prevent_message_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Messages are immutable after creation.'
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function maintain_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conversation_id uuid := coalesce(new.conversation_id, old.conversation_id);
begin
  update conversations
  set preview = coalesce((
        select m.content
        from messages m
        where m.conversation_id = v_conversation_id
        order by m.created_at desc, m.id desc
        limit 1
      ), '')
  where id = v_conversation_id;
  if tg_op = 'delete' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_conversation_fields_trigger on conversations;
create trigger protect_conversation_fields_trigger
before update on conversations
for each row execute function protect_conversation_fields();

drop trigger if exists prevent_message_mutation_trigger on messages;
create trigger prevent_message_mutation_trigger
before update or delete on messages
for each row execute function prevent_message_mutation();

drop trigger if exists maintain_conversation_from_message_trigger on messages;
create trigger maintain_conversation_from_message_trigger
after insert or delete on messages
for each row execute function maintain_conversation_from_message();

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

-- Notifications are provisioned by the authoritative Phase 8H migration.
-- Keeping one canonical contract avoids the historical recipient_id/action schema
-- conflicting with the current user_id/title/message client contract.
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
-- application context so the UI can use Supabase as its source of truth.
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
  original_price numeric(10, 2),
  discounted_price numeric(10, 2),
  promotion_id uuid references promotions(id) on delete set null,
  promotion_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, listing_id)
);

alter table order_items add column if not exists original_price numeric(10, 2);
alter table order_items add column if not exists discounted_price numeric(10, 2);
alter table order_items add column if not exists promotion_id uuid references promotions(id) on delete set null;
alter table order_items add column if not exists promotion_title text;

-- Payment records are durable and independently queryable for buyer/seller history.
create table if not exists payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete restrict,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists payments_buyer_idx on payments (buyer_id, created_at desc);
create index if not exists payments_seller_idx on payments (seller_id, created_at desc);
create index if not exists payments_status_idx on payments (payment_status);
alter table payments enable row level security;
drop policy if exists "Users can view related payments" on payments;
create policy "Users can view related payments"
  on payments for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "Buyers can create their own payments" on payments;
create policy "Buyers can create their own payments"
  on payments for insert to authenticated
  with check (auth.uid() = buyer_id);
drop policy if exists "Payment status is service managed" on payments;
create policy "Payment status is service managed"
  on payments for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Review relationships and indexes. Orders and order_items are declared above,
-- so these foreign keys can be added safely for both new and existing databases.
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.reviews'::regclass
      and c.confrelid = 'public.profiles'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%(reviewee_id)%'
  ) then
    alter table reviews
      add constraint reviews_reviewee_id_fkey
      foreign key (reviewee_id) references profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.reviews'::regclass
      and c.confrelid = 'public.orders'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%(order_id)%'
  ) then
    alter table reviews
      add constraint reviews_order_id_fkey
      foreign key (order_id) references orders(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.reviews'::regclass
      and c.confrelid = 'public.order_items'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%(order_item_id)%'
  ) then
    alter table reviews
      add constraint reviews_order_item_id_fkey
      foreign key (order_item_id) references order_items(id) on delete cascade;
  end if;
end;
$$;

create index if not exists reviews_listing_idx on reviews (listing_id);
create index if not exists reviews_reviewer_idx on reviews (reviewer_id);
create index if not exists reviews_reviewee_idx on reviews (reviewee_id);
create index if not exists reviews_order_idx on reviews (order_id);
create index if not exists reviews_order_item_idx on reviews (order_item_id);
create index if not exists reviews_type_idx on reviews (review_type);
create index if not exists reviews_status_idx on reviews (status);
create index if not exists reviews_created_at_idx on reviews (created_at desc);

-- A buyer can submit one product review for a specific purchased listing/order
-- item, one seller review per order, and a seller can submit one buyer review
-- per order. Nullable legacy rows are intentionally excluded from these keys.
create unique index if not exists reviews_product_duplicate_idx
  on reviews (reviewer_id, order_item_id, listing_id)
  where review_type = 'product'
    and reviewer_id is not null
    and order_item_id is not null
    and listing_id is not null;

create unique index if not exists reviews_seller_duplicate_idx
  on reviews (reviewer_id, order_id, reviewee_id)
  where review_type = 'seller'
    and reviewer_id is not null
    and order_id is not null
    and reviewee_id is not null;

create unique index if not exists reviews_buyer_duplicate_idx
  on reviews (reviewer_id, order_id, reviewee_id)
  where review_type = 'buyer'
    and reviewer_id is not null
    and order_id is not null
    and reviewee_id is not null;

create or replace function protect_review_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.reviewer_id is distinct from old.reviewer_id
    or new.review_type is distinct from old.review_type
    or new.reviewee_id is distinct from old.reviewee_id
    or new.listing_id is distinct from old.listing_id
    or new.order_id is distinct from old.order_id
    or new.order_item_id is distinct from old.order_item_id
  then
    raise exception 'Review ownership and target linkage are immutable.'
      using errcode = 'insufficient_privilege';
  end if;

  if (new.status is distinct from old.status
      or new.published_at is distinct from old.published_at
      or new.deleted_at is distinct from old.deleted_at)
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and coalesce(auth.jwt()->>'role', '') not in ('service_role', 'admin', 'moderator')
  then
    raise exception 'Review moderation fields can only be changed by a moderator.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_review_immutable_fields_trigger on reviews;
create trigger protect_review_immutable_fields_trigger
before update on reviews
for each row execute function protect_review_immutable_fields();

-- Creates a validated, published review. The caller cannot provide reviewer_id,
-- seller/buyer identity, or unrelated order/listing linkage.
create or replace function create_review(
  p_review_type text,
  p_rating smallint,
  p_order_id uuid,
  p_reviewee_id uuid default null,
  p_listing_id uuid default null,
  p_order_item_id uuid default null,
  p_title text default null,
  p_body text default null,
  p_criteria jsonb default '{}'::jsonb,
  p_photos jsonb default '[]'::jsonb
)
returns reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_review reviews;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_review_type not in ('product', 'seller', 'buyer') then
    raise exception 'Review type is invalid.' using errcode = 'check_violation';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Review rating must be between 1 and 5.' using errcode = 'check_violation';
  end if;
  if p_order_id is null then
    raise exception 'A completed order is required.' using errcode = 'check_violation';
  end if;
  if p_criteria is null or jsonb_typeof(p_criteria) <> 'object' then
    raise exception 'Review criteria must be a JSON object.' using errcode = 'check_violation';
  end if;
  if p_photos is null or jsonb_typeof(p_photos) <> 'array' then
    raise exception 'Review photos must be a JSON array.' using errcode = 'check_violation';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
    and status = 'Completed'
  for share;
  if not found then
    raise exception 'Reviews require a completed order.' using errcode = 'check_violation';
  end if;

  if p_review_type = 'product' then
    if v_order.buyer_id <> auth.uid()
      or p_listing_id is null
      or p_order_item_id is null
      or p_reviewee_id is not null
      or not exists (
        select 1
        from order_items oi
        where oi.id = p_order_item_id
          and oi.order_id = p_order_id
          and oi.listing_id = p_listing_id
          and exists (
            select 1 from listings l
            where l.id = p_listing_id
              and l.seller_id = v_order.seller_id
          )
      ) then
      raise exception 'Product reviews require the buyer''s matching purchased listing and order item.'
        using errcode = 'insufficient_privilege';
    end if;
  elsif p_review_type = 'seller' then
    if v_order.buyer_id <> auth.uid()
      or p_reviewee_id is distinct from v_order.seller_id
      or p_listing_id is not null
      or p_order_item_id is not null then
      raise exception 'Seller reviews require the buyer and the seller from the completed order.'
        using errcode = 'insufficient_privilege';
    end if;
  elsif p_review_type = 'buyer' then
    if v_order.seller_id <> auth.uid()
      or p_reviewee_id is distinct from v_order.buyer_id
      or p_listing_id is not null
      or p_order_item_id is not null then
      raise exception 'Buyer reviews require the seller and the buyer from the completed order.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  insert into reviews (
    review_type, reviewer_id, reviewee_id, listing_id, order_id, order_item_id,
    rating, title, body, criteria, photos, status, published_at
  ) values (
    p_review_type, auth.uid(), p_reviewee_id, p_listing_id, p_order_id, p_order_item_id,
    p_rating, p_title, p_body, p_criteria, p_photos, 'published', now()
  ) returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function create_review(text, smallint, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb) from public;
grant execute on function create_review(text, smallint, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb) to authenticated;

-- Conversation relationships and indexes. These statements are migration-safe
-- for databases that already contain the original conversations table.
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.conversations'::regclass
      and c.confrelid = 'public.orders'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%(order_id)%'
  ) then
    alter table conversations
      add constraint conversations_order_id_fkey
      foreign key (order_id)
      references orders(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.conversations'::regclass
      and c.confrelid = 'public.listings'::regclass
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) like '%(listing_id)%'
  ) then
    alter table conversations
      add constraint conversations_listing_id_fkey
      foreign key (listing_id)
      references listings(id)
      on delete set null;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and conname = 'conversations_distinct_participants_check'
  ) then
    alter table conversations
      add constraint conversations_distinct_participants_check
      check (buyer_id <> seller_id);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and conname = 'conversations_context_check'
  ) then
    alter table conversations
      add constraint conversations_context_check
      check (
        (conversation_type = 'standard' and listing_id is null and order_id is null)
        or (conversation_type = 'service' and listing_id is not null)
        or (conversation_type = 'order' and order_id is not null)
        or conversation_type in ('trading', 'trade_proposal')
      );
  end if;
end;
$$;

alter table conversations
  drop constraint if exists conversations_buyer_id_seller_id_listing_id_key;

create index if not exists conversations_buyer_idx
  on conversations (buyer_id);

create index if not exists conversations_seller_idx
  on conversations (seller_id);

create index if not exists conversations_order_idx
  on conversations (order_id)
  where order_id is not null;

create index if not exists conversations_listing_idx
  on conversations (listing_id)
  where listing_id is not null;

create index if not exists conversations_type_idx
  on conversations (conversation_type);

create index if not exists conversations_updated_idx
  on conversations (updated_at desc);

create unique index if not exists conversations_standard_pair_idx
  on conversations (buyer_id, seller_id)
  where conversation_type = 'standard'
    and listing_id is null
    and order_id is null;

create unique index if not exists conversations_service_listing_idx
  on conversations (buyer_id, seller_id, listing_id)
  where conversation_type = 'service'
    and listing_id is not null;

create unique index if not exists conversations_order_unique_idx
  on conversations (order_id)
  where conversation_type = 'order'
    and order_id is not null;

create unique index if not exists conversations_trading_key_idx
  on conversations (
    buyer_id,
    seller_id,
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(order_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where conversation_type = 'trading';

create unique index if not exists conversations_trade_proposal_key_idx
  on conversations (
    buyer_id,
    seller_id,
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(order_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where conversation_type = 'trade_proposal';

-- Once orders exists, complete the cross-table creation check that could not
-- be declared beside conversations because orders is provisioned later.
drop policy if exists "Buyers can create conversations" on conversations;
create policy "Buyers can create conversations"
  on conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and (
      listing_id is null
      or exists (
        select 1 from listings l
        where l.id = listing_id and l.seller_id = seller_id
      )
    )
    and (
      order_id is null
      or exists (
        select 1 from orders o
        where o.id = order_id
          and o.buyer_id = buyer_id
          and o.seller_id = seller_id
      )
    )
  );

create or replace function upsert_conversation(
  p_seller_id uuid,
  p_conversation_type text default 'standard',
  p_listing_id uuid default null,
  p_order_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns conversations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_conversation conversations;
  v_lock_key text;
begin
  if v_buyer_id is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from profiles where id = v_buyer_id and suspended_at is not null) then
    raise exception 'Suspended accounts cannot create conversations.' using errcode = 'insufficient_privilege';
  end if;
  if p_seller_id is null or p_seller_id = v_buyer_id then
    raise exception 'A conversation requires a different seller.' using errcode = 'check_violation';
  end if;
  if p_conversation_type not in ('standard', 'service', 'order', 'trading', 'trade_proposal') then
    raise exception 'Conversation type is invalid.' using errcode = 'check_violation';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Conversation metadata must be a JSON object.' using errcode = 'check_violation';
  end if;
  if p_listing_id is not null and not exists (
    select 1 from listings where id = p_listing_id and seller_id = p_seller_id
  ) then
    raise exception 'Listing is not owned by the selected seller.' using errcode = 'foreign_key_violation';
  end if;
  if p_order_id is not null and not exists (
    select 1 from orders
    where id = p_order_id and buyer_id = v_buyer_id and seller_id = p_seller_id
  ) then
    raise exception 'Order does not belong to both conversation participants.' using errcode = 'foreign_key_violation';
  end if;
  if p_conversation_type = 'standard' and (p_listing_id is not null or p_order_id is not null) then
    raise exception 'Standard conversations cannot have listing or order context.' using errcode = 'check_violation';
  end if;
  if p_conversation_type = 'service' and p_listing_id is null then
    raise exception 'Service conversations require a listing.' using errcode = 'check_violation';
  end if;
  if p_conversation_type = 'order' and p_order_id is null then
    raise exception 'Order conversations require an order.' using errcode = 'check_violation';
  end if;

  v_lock_key := concat_ws(':', v_buyer_id, p_seller_id, p_conversation_type,
    coalesce(p_listing_id::text, ''), coalesce(p_order_id::text, ''));
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  select * into v_conversation
  from conversations
  where buyer_id = v_buyer_id
    and seller_id = p_seller_id
    and conversation_type = p_conversation_type
    and listing_id is not distinct from p_listing_id
    and order_id is not distinct from p_order_id
  for update;

  if found then
    update conversations
    set metadata = v_conversation.metadata || p_metadata
    where id = v_conversation.id
    returning * into v_conversation;
    return v_conversation;
  end if;

  insert into conversations (buyer_id, seller_id, listing_id, conversation_type, order_id, metadata)
  values (v_buyer_id, p_seller_id, p_listing_id, p_conversation_type, p_order_id, p_metadata)
  returning * into v_conversation;
  return v_conversation;
end;
$$;

revoke execute on function upsert_conversation(uuid, text, uuid, uuid, jsonb) from public;
grant execute on function upsert_conversation(uuid, text, uuid, uuid, jsonb) to authenticated;

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

drop trigger if exists reviews_set_updated_at on reviews;
create trigger reviews_set_updated_at
before update on reviews
for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

drop trigger if exists order_items_set_updated_at on order_items;
create trigger order_items_set_updated_at
before update on order_items
for each row execute function set_updated_at();

drop trigger if exists conversations_set_updated_at on conversations;
create trigger conversations_set_updated_at
before update on conversations
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

-- Order status updates are performed only by the protected status RPC added
-- in the ordered server-validation migration. Direct authenticated updates
-- remain disabled after the base schema is provisioned.

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
  v_original_price numeric(10, 2);
  v_discounted_price numeric(10, 2);
  v_promotion_id uuid;
  v_promotion_title text;
  v_promotion_type text;
  v_discount_value numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_delivery_fee numeric(10, 2) := coalesce(p_delivery_fee, 0);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Suspended accounts cannot place orders.' using errcode = 'insufficient_privilege';
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

    v_original_price := v_listing.price;
    v_discounted_price := v_original_price;
    v_promotion_id := null;
    v_promotion_title := null;
    v_promotion_type := null;
    v_discount_value := null;
    select id, title, coalesce(promotion_type, discount_type), discount_value
      into v_promotion_id, v_promotion_title, v_promotion_type, v_discount_value
      from promotions
      where seller_id = p_seller_id
        and status = 'active'
        and current_date >= start_date
        and (end_date is null or current_date <= end_date)
        and (
          listing_id = coalesce(v_listing.legacy_id, v_listing.id::text)
          or listing_ids @> jsonb_build_array(coalesce(v_listing.legacy_id, v_listing.id::text))
          or listing_ids @> jsonb_build_array(v_listing.id::text)
        )
      order by created_at desc
      limit 1;
    if v_promotion_id is not null then
      v_discounted_price := case
        when v_promotion_type = 'percentage' then v_original_price * (1 - least(100, greatest(0, coalesce(v_discount_value, 0))) / 100)
        when v_promotion_type in ('dollar', 'fixed', 'fixed_amount') then v_original_price - greatest(0, coalesce(v_discount_value, 0))
        else v_original_price
      end;
      v_discounted_price := greatest(0, round(v_discounted_price, 2));
    end if;
    v_subtotal := v_subtotal + (v_quantity * v_discounted_price);
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
    select * into v_listing from listings where id = v_listing_id;
    v_original_price := v_listing.price;
    v_discounted_price := v_original_price;
    v_promotion_id := null;
    v_promotion_title := null;
    v_promotion_type := null;
    v_discount_value := null;
    select id, title, coalesce(promotion_type, discount_type), discount_value
      into v_promotion_id, v_promotion_title, v_promotion_type, v_discount_value
      from promotions
      where seller_id = v_listing.seller_id
        and status = 'active'
        and current_date >= start_date
        and (end_date is null or current_date <= end_date)
        and (
          listing_id = coalesce(v_listing.legacy_id, v_listing.id::text)
          or listing_ids @> jsonb_build_array(coalesce(v_listing.legacy_id, v_listing.id::text))
          or listing_ids @> jsonb_build_array(v_listing.id::text)
        )
      order by created_at desc
      limit 1;
    if v_promotion_id is not null then
      v_discounted_price := case
        when v_promotion_type = 'percentage' then v_original_price * (1 - least(100, greatest(0, coalesce(v_discount_value, 0))) / 100)
        when v_promotion_type in ('dollar', 'fixed', 'fixed_amount') then v_original_price - greatest(0, coalesce(v_discount_value, 0))
        else v_original_price
      end;
      v_discounted_price := greatest(0, round(v_discounted_price, 2));
    end if;
    insert into order_items (order_id, listing_id, quantity, unit_price, line_total, original_price, discounted_price, promotion_id, promotion_title)
    values (
      v_order.id,
      v_listing_id,
      (v_item->>'quantity')::integer,
      v_discounted_price,
      (v_item->>'quantity')::integer * v_discounted_price,
      v_original_price,
      v_discounted_price,
      v_promotion_id,
      v_promotion_title
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
  if v_order.status not in ('New', 'Order Placed', 'Seller Notified') then
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

-- The legacy_order_id index remains required for idempotent Supabase order
-- creation retries. The one-time localStorage import function is retired.
create unique index if not exists orders_legacy_import_idx
  on orders (buyer_id, (metadata->>'legacy_order_id'))
  where metadata ? 'legacy_order_id';

drop function if exists import_legacy_orders(jsonb);

-- Phase 7B reputation domain. These tables provide the durable foundation for
-- reputation events, badge definitions, awarded badges, and status snapshots.
create table if not exists reputation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id text,
  value numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint reputation_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists badge_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  badge_type text not null,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint badge_definitions_criteria_object_check
    check (jsonb_typeof(criteria) = 'object')
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badge_definitions(id) on delete cascade,
  status text not null default 'active',
  awarded_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint user_badges_user_badge_unique unique (user_id, badge_id),
  constraint user_badges_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists user_reputation_status (
  user_id uuid not null references auth.users(id) on delete cascade,
  audience text not null,
  status_code text not null,
  progress jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  definition_version text not null default '1',
  primary key (user_id, audience),
  constraint user_reputation_status_progress_object_check
    check (jsonb_typeof(progress) = 'object'),
  constraint user_reputation_status_metrics_object_check
    check (jsonb_typeof(metrics) = 'object')
);

create index if not exists reputation_events_user_idx
  on reputation_events (user_id, created_at desc);
create index if not exists reputation_events_actor_idx
  on reputation_events (actor_id, created_at desc);
create index if not exists reputation_events_type_idx
  on reputation_events (event_type);
create index if not exists reputation_events_entity_idx
  on reputation_events (entity_type, entity_id);
create index if not exists badge_definitions_active_idx
  on badge_definitions (active);
create index if not exists user_badges_user_idx
  on user_badges (user_id, status);
create index if not exists user_badges_badge_idx
  on user_badges (badge_id, status);
create index if not exists user_reputation_status_audience_idx
  on user_reputation_status (audience, status_code);

alter table reputation_events enable row level security;
alter table badge_definitions enable row level security;
alter table user_badges enable row level security;
alter table user_reputation_status enable row level security;

-- Reputation reads are intentionally available to authenticated users so public
-- profiles can render badges and status snapshots. Badge awards remain owner-only.
drop policy if exists "Active badge definitions are viewable by everyone" on badge_definitions;
create policy "Active badge definitions are viewable by everyone"
  on badge_definitions for select to authenticated
  using (active);

drop policy if exists "User badges are viewable by authenticated users" on user_badges;
create policy "User badges are viewable by authenticated users"
  on user_badges for select to authenticated
  using (true);

drop policy if exists "Users can award their own badges" on user_badges;
create policy "Users can award their own badges"
  on user_badges for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own badges" on user_badges;
create policy "Users can update their own badges"
  on user_badges for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Reputation statuses are viewable by authenticated users" on user_reputation_status;
create policy "Reputation statuses are viewable by authenticated users"
  on user_reputation_status for select to authenticated
  using (true);

drop policy if exists "Users can create their own reputation statuses" on user_reputation_status;
create policy "Users can create their own reputation statuses"
  on user_reputation_status for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reputation statuses" on user_reputation_status;
create policy "Users can update their own reputation statuses"
  on user_reputation_status for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Initial badge catalog. Definitions are inserted without changing existing
-- rows, allowing future criteria and presentation changes to be managed safely.
insert into badge_definitions (code, name, description, icon, badge_type)
values
  ('founding_member', 'Founding Member', 'An early member of the Grolo community.', 'founding_member', 'community'),
  ('trusted_buyer', 'Trusted Buyer', 'A buyer with a reliable marketplace history.', 'trusted_buyer', 'buyer'),
  ('established_buyer', 'Established Buyer', 'A buyer with an established marketplace history.', 'established_buyer', 'buyer'),
  ('community_champion', 'Community Champion', 'A member who actively contributes to the community.', 'community_champion', 'community'),
  ('community_trusted', 'Community Trusted', 'A member recognized as trusted by the community.', 'community_trusted', 'community'),
  ('grolo_ambassador', 'Grolo Ambassador', 'A member who represents and supports Grolo.', 'grolo_ambassador', 'community'),
  ('community_growing', 'Community Growing', 'Recognition for a growing community presence.', 'community_growing', 'community'),
  ('community_flourishing', 'Community Flourishing', 'Recognition for a flourishing community presence.', 'community_flourishing', 'community'),
  ('grolo_partner', 'Grolo Partner', 'A trusted partner contributing to Grolo.', 'grolo_partner', 'partner')
on conflict (code) do nothing;
