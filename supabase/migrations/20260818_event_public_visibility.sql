-- Restore the events table expected by the application before configuring
-- public discovery policies. This is safe to run when the table is absent
-- and preserves existing rows when it already exists.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  legacy_id text unique,
  title text not null,
  type text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  description text not null,
  image_url text,
  neighborhood text,
  city text,
  province text,
  country text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  capacity integer check (capacity is null or capacity >= 0),
  visibility text not null default 'public',
  likes integer not null default 0,
  comments integer not null default 0,
  reposts integer not null default 0,
  shares integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists legacy_id text;
alter table public.events add column if not exists image_url text;
alter table public.events add column if not exists neighborhood text;
alter table public.events add column if not exists city text;
alter table public.events add column if not exists province text;
alter table public.events add column if not exists country text;
alter table public.events add column if not exists postal_code text;
alter table public.events add column if not exists latitude double precision;
alter table public.events add column if not exists longitude double precision;
alter table public.events add column if not exists capacity integer;
alter table public.events add column if not exists visibility text not null default 'public';
alter table public.events add column if not exists likes integer not null default 0;
alter table public.events add column if not exists comments integer not null default 0;
alter table public.events add column if not exists reposts integer not null default 0;
alter table public.events add column if not exists shares integer not null default 0;
alter table public.events add column if not exists created_at timestamptz not null default now();
alter table public.events add column if not exists updated_at timestamptz not null default now();

create unique index if not exists events_legacy_id_key on public.events (legacy_id) where legacy_id is not null;
create index if not exists events_seller_idx on public.events (seller_id);
create index if not exists events_date_idx on public.events (date);
create index if not exists events_visibility_date_idx on public.events (visibility, date);

alter table public.events enable row level security;

drop policy if exists "Events are viewable by everyone" on public.events;
drop policy if exists "Events are viewable when public" on public.events;
drop policy if exists "Sellers can manage their own events" on public.events;

create policy "Events are viewable when public"
  on public.events for select
  using (visibility = 'public' or auth.uid() = seller_id);

create policy "Sellers can manage their own events"
  on public.events for all
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

notify pgrst, 'reload schema';
