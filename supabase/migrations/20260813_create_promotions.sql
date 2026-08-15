-- Phase 8F: durable promotions persistence.
-- Apply this migration in the Supabase SQL editor or with the Supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  listing_id text,
  listing_ids jsonb not null default '[]'::jsonb,
  title text not null,
  description text not null default '',
  promotion_type text not null default 'percentage',
  discount_type text not null default 'percentage',
  discount_value numeric(10, 2),
  start_date date not null default current_date,
  end_date date,
  image_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions add column if not exists listing_id text;
alter table public.promotions add column if not exists listing_ids jsonb not null default '[]'::jsonb;
alter table public.promotions add column if not exists description text not null default '';
alter table public.promotions add column if not exists promotion_type text not null default 'percentage';
alter table public.promotions add column if not exists discount_type text not null default 'percentage';
alter table public.promotions add column if not exists discount_value numeric(10, 2);
alter table public.promotions add column if not exists start_date date not null default current_date;
alter table public.promotions add column if not exists end_date date;
alter table public.promotions add column if not exists image_url text;
alter table public.promotions add column if not exists status text not null default 'active';
alter table public.promotions add column if not exists created_at timestamptz not null default now();
alter table public.promotions add column if not exists updated_at timestamptz not null default now();

update public.promotions
set promotion_type = coalesce(nullif(promotion_type, ''), discount_type, 'percentage'),
    discount_type = coalesce(nullif(discount_type, ''), promotion_type, 'percentage')
where promotion_type is null or promotion_type = '' or discount_type is null or discount_type = '';

create index if not exists promotions_seller_idx on public.promotions (seller_id);
create index if not exists promotions_dates_idx on public.promotions (start_date, end_date);
create index if not exists promotions_status_idx on public.promotions (status);

alter table public.promotions enable row level security;
drop policy if exists "Promotions are viewable by everyone" on public.promotions;
create policy "Promotions are viewable by everyone"
  on public.promotions for select using (true);
drop policy if exists "Sellers can manage their own promotions" on public.promotions;
create policy "Sellers can manage their own promotions"
  on public.promotions for all to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

notify pgrst, 'reload schema';
