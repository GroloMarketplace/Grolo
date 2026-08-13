-- Phase 8G: persistent favorites and vendor following.

alter table public.favorites add column if not exists id uuid default gen_random_uuid();
alter table public.favorites alter column id set not null;
create unique index if not exists favorites_user_listing_idx on public.favorites (user_id, listing_id);

alter table public.user_follows add column if not exists id uuid default gen_random_uuid();
alter table public.user_follows add column if not exists vendor_id text;
alter table public.user_follows add column if not exists seller_id text;
update public.user_follows set vendor_id = coalesce(vendor_id, seller_id) where vendor_id is null;
update public.user_follows set seller_id = coalesce(seller_id, vendor_id) where seller_id is null;
alter table public.user_follows alter column id set not null;

-- Existing seller_id is the vendor identifier used by the application and is
-- retained for backward compatibility with existing follow rows.
create index if not exists user_follows_seller_idx on public.user_follows (seller_id);
create index if not exists user_follows_vendor_idx on public.user_follows (vendor_id);
create index if not exists user_follows_follower_idx on public.user_follows (follower_id);

notify pgrst, 'reload schema';
