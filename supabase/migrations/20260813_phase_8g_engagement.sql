-- Phase 8G: persistent favorites and vendor following.
-- seller_id is the only required follow identifier used by the application.
-- vendor_id is nullable legacy compatibility data for older installations.

alter table public.favorites add column if not exists id uuid default gen_random_uuid();
alter table public.favorites alter column id set not null;
create unique index if not exists favorites_user_listing_idx on public.favorites (user_id, listing_id);

alter table public.user_follows add column if not exists id uuid default gen_random_uuid();
alter table public.user_follows add column if not exists vendor_id text;
alter table public.user_follows add column if not exists seller_id text;
update public.user_follows set seller_id = coalesce(seller_id, vendor_id) where seller_id is null;
alter table public.user_follows alter column vendor_id drop not null;
alter table public.user_follows alter column seller_id set not null;
alter table public.user_follows alter column id set not null;

create unique index if not exists user_follows_follower_seller_idx
  on public.user_follows (follower_id, seller_id);
create index if not exists user_follows_seller_idx on public.user_follows (seller_id);
create index if not exists user_follows_vendor_idx on public.user_follows (vendor_id);
create index if not exists user_follows_follower_idx on public.user_follows (follower_id);

notify pgrst, 'reload schema';
