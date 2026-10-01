-- Ensure payment bookkeeping exists for order history and status tracking.
create table if not exists public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);

create index if not exists payments_buyer_idx on public.payments (buyer_id, created_at desc);
create index if not exists payments_seller_idx on public.payments (seller_id, created_at desc);
create index if not exists payments_status_idx on public.payments (payment_status);

alter table public.payments enable row level security;

drop policy if exists "Users can view related payments" on public.payments;
create policy "Users can view related payments"
  on public.payments for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyers can create their own payments" on public.payments;
create policy "Buyers can create their own payments"
  on public.payments for insert to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "Payment status is service managed" on public.payments;
create policy "Payment status is service managed"
  on public.payments for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

notify pgrst, 'reload schema';
