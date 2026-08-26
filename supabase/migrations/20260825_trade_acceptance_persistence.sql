alter table public.trade_proposals
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid references auth.users(id);

alter table public.trade_proposals enable row level security;

drop policy if exists "Sellers can respond to trade proposals" on public.trade_proposals;
create policy "Sellers can respond to trade proposals"
  on public.trade_proposals for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
