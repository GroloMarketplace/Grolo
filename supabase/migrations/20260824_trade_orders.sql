create table if not exists public.trade_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  requested_listing jsonb not null default '{}'::jsonb,
  offered_listings jsonb not null default '[]'::jsonb,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  constraint trade_orders_requested_listing_object_check check (jsonb_typeof(requested_listing) = 'object'),
  constraint trade_orders_offered_listings_array_check check (jsonb_typeof(offered_listings) = 'array')
);

alter table public.trade_orders enable row level security;

drop policy if exists "Trade participants can view trade orders" on public.trade_orders;
create policy "Trade participants can view trade orders"
  on public.trade_orders for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Sellers can create accepted trade orders" on public.trade_orders;
create policy "Sellers can create accepted trade orders"
  on public.trade_orders for insert to authenticated
  with check (auth.uid() = seller_id);
