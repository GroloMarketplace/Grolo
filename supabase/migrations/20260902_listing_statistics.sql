-- Populate listing cards from live engagement data instead of denormalized metadata.

create table if not exists public.regrow_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint regrow_transactions_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create index if not exists regrow_transactions_listing_idx
  on public.regrow_transactions (listing_id, status);

alter table public.regrow_transactions enable row level security;

create or replace function public.get_listing_statistics(p_listing_ids uuid[])
returns table (
  listing_id uuid,
  views bigint,
  likes bigint,
  reviews bigint,
  regrows bigint,
  purchases bigint,
  last_activity_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    coalesce((select count(*) from public.vendor_analytics_events e
      where e.listing_id = l.id and e.event_type = 'listing_view'), 0),
    coalesce((select count(*) from public.favorites f
      where f.listing_id = l.id), 0),
    coalesce((select count(*) from public.reviews r
      where r.listing_id = l.id
        and r.review_type = 'product'
        and r.status = 'published'
        and r.deleted_at is null), 0),
    coalesce((select count(*) from public.regrow_transactions rt
      where rt.listing_id = l.id and rt.status = 'completed'), 0),
    coalesce((select sum(oi.quantity) from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.listing_id = l.id and o.status = 'Completed'), 0),
    nullif(greatest(
      coalesce((select max(e.created_at) from public.vendor_analytics_events e where e.listing_id = l.id and e.event_type = 'listing_view'), 'epoch'::timestamptz),
      coalesce((select max(f.created_at) from public.favorites f where f.listing_id = l.id), 'epoch'::timestamptz),
      coalesce((select max(r.created_at) from public.reviews r where r.listing_id = l.id and r.status = 'published' and r.deleted_at is null), 'epoch'::timestamptz),
      coalesce((select max(rt.completed_at) from public.regrow_transactions rt where rt.listing_id = l.id and rt.status = 'completed'), 'epoch'::timestamptz),
      coalesce((select max(o.created_at) from public.order_items oi join public.orders o on o.id = oi.order_id where oi.listing_id = l.id and o.status = 'Completed'), 'epoch'::timestamptz)
    ), 'epoch'::timestamptz)
  from public.listings l
  where l.id = any(coalesce(p_listing_ids, '{}'::uuid[]));
$$;

revoke all on function public.get_listing_statistics(uuid[]) from public;
grant execute on function public.get_listing_statistics(uuid[]) to anon, authenticated;

do $verification$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'regrow_transactions') then
    alter publication supabase_realtime add table public.regrow_transactions;
  end if;
end;
$verification$;

notify pgrst, 'reload schema';
