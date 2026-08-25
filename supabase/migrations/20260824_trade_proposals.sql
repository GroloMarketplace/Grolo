create table if not exists public.trade_proposals (
  id text primary key,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  requested_listing jsonb not null default '{}'::jsonb,
  offered_listings jsonb not null default '[]'::jsonb,
  message text not null default '',
  photos jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint trade_proposals_requested_listing_object_check check (jsonb_typeof(requested_listing) = 'object'),
  constraint trade_proposals_offered_listings_array_check check (jsonb_typeof(offered_listings) = 'array'),
  constraint trade_proposals_photos_array_check check (jsonb_typeof(photos) = 'array')
);

alter table public.trade_proposals enable row level security;

drop policy if exists "Trade participants can view trade proposals" on public.trade_proposals;
create policy "Trade participants can view trade proposals"
  on public.trade_proposals for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create trade proposals" on public.trade_proposals;
create policy "Buyers can create trade proposals"
  on public.trade_proposals for insert to authenticated
  with check (auth.uid() = buyer_id);
