-- Phase 9B: durable community posts.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  author_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete cascade,
  product_id text,
  body text not null default '',
  classification text not null default '',
  location text not null default '',
  latitude double precision,
  longitude double precision,
  group_name text not null default 'Your Community',
  author_name text not null default '',
  author_avatar text not null default '',
  image_url text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  visibility text not null default 'public' check (visibility in ('public', 'hidden')),
  likes integer not null default 0,
  comments integer not null default 0,
  reposts integer not null default 0,
  shares integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_visibility_created_idx on public.posts (visibility, created_at desc);
create index if not exists posts_seller_created_idx on public.posts (seller_id, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable when public" on public.posts;
create policy "Posts are viewable when public"
  on public.posts for select
  using (visibility = 'public' or auth.uid() = author_id);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = author_id and (seller_id is null or seller_id = auth.uid()));

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id and (seller_id is null or seller_id = auth.uid()));

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated
  using (auth.uid() = author_id);
