-- Marketplace-safe listing archival.
-- Listings referenced by order_items cannot be physically deleted.

create index if not exists listings_status_idx on public.listings (status);

notify pgrst, 'reload schema';
