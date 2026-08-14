-- Phase 8I: Supabase-backed vendor analytics.

create table if not exists public.vendor_analytics_events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('listing_view', 'promotion_view', 'promotion_click')),
  listing_id uuid references public.listings(id) on delete cascade,
  promotion_id uuid references public.promotions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists vendor_analytics_events_seller_idx
  on public.vendor_analytics_events (seller_id, created_at desc);
create index if not exists vendor_analytics_events_listing_idx
  on public.vendor_analytics_events (listing_id, event_type, created_at desc);
create index if not exists vendor_analytics_events_promotion_idx
  on public.vendor_analytics_events (promotion_id, event_type, created_at desc);

alter table public.vendor_analytics_events enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vendor_analytics_events') then
    alter publication supabase_realtime add table public.vendor_analytics_events;
  end if;
end;
$$;

drop policy if exists "Sellers can view their analytics events" on public.vendor_analytics_events;
create policy "Sellers can view their analytics events"
  on public.vendor_analytics_events for select to authenticated
  using (auth.uid() = seller_id);
drop policy if exists "Authenticated users can record analytics events" on public.vendor_analytics_events;
create policy "Sellers can record their analytics events"
  on public.vendor_analytics_events for insert to authenticated
  with check (auth.uid() = seller_id);

create or replace function public.get_vendor_analytics(
  p_seller_id uuid,
  p_period_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  period_days integer := greatest(1, least(coalesce(p_period_days, 30), 365));
  period_start timestamptz := now() - make_interval(days => period_days - 1);
  today_start timestamptz := date_trunc('day', now());
  week_start timestamptz := date_trunc('week', now());
  month_start timestamptz := date_trunc('month', now());
  listing_count integer;
  active_promotion_count integer;
  follower_count integer;
  favorite_count integer;
  order_count integer;
  revenue_today numeric;
  revenue_week numeric;
  revenue_month numeric;
  view_count integer;
  listing_order_count integer;
  promotion_view_count integer;
  promotion_click_count integer;
  promotion_purchase_count integer;
  promotion_revenue numeric;
  daily jsonb;
begin
  if p_seller_id is null or auth.uid() is distinct from p_seller_id then
    raise exception 'Only the seller can view vendor analytics';
  end if;

  select count(*) into follower_count
  from public.user_follows
  where seller_id = p_seller_id::text;

  select count(*) into listing_count
  from public.listings
  where seller_id = p_seller_id
    and coalesce(status, 'Active') <> 'Archived';

  select count(*) into active_promotion_count
  from public.promotions
  where seller_id = p_seller_id
    and status = 'active'
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date);

  select count(*) into favorite_count
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where l.seller_id = p_seller_id;

  select count(*) into order_count
  from public.orders o
  where o.seller_id = p_seller_id
    and coalesce(o.status, '') <> 'Cancelled';

  select
    coalesce(sum(case when o.created_at >= today_start then o.total else 0 end), 0),
    coalesce(sum(case when o.created_at >= week_start then o.total else 0 end), 0),
    coalesce(sum(case when o.created_at >= month_start then o.total else 0 end), 0)
  into revenue_today, revenue_week, revenue_month
  from public.orders o
  where o.seller_id = p_seller_id
    and coalesce(o.status, '') <> 'Cancelled';

  select count(*) into view_count
  from public.vendor_analytics_events e
  where e.seller_id = p_seller_id
    and e.event_type = 'listing_view'
    and e.created_at >= period_start;

  select count(*) into listing_order_count
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.seller_id = p_seller_id
    and coalesce(o.status, '') <> 'Cancelled';

  select count(*) into promotion_view_count
  from public.vendor_analytics_events e
  where e.seller_id = p_seller_id
    and e.event_type = 'promotion_view'
    and e.created_at >= period_start;

  select count(*) into promotion_click_count
  from public.vendor_analytics_events e
  where e.seller_id = p_seller_id
    and e.event_type = 'promotion_click'
    and e.created_at >= period_start;

  select count(*), coalesce(sum(oi.line_total), 0)
  into promotion_purchase_count, promotion_revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.promotions p on p.id = oi.promotion_id
  where o.seller_id = p_seller_id
    and coalesce(o.status, '') <> 'Cancelled';

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', day::date,
    'label', to_char(day, 'Mon DD'),
    'views', coalesce((select count(*) from public.vendor_analytics_events e where e.seller_id = p_seller_id and e.event_type = 'listing_view' and e.created_at >= day and e.created_at < day + interval '1 day'), 0),
    'favorites', coalesce((select count(*) from public.favorites f join public.listings l on l.id = f.listing_id where l.seller_id = p_seller_id and f.created_at >= day and f.created_at < day + interval '1 day'), 0),
    'orders', coalesce((select count(*) from public.orders o where o.seller_id = p_seller_id and o.created_at >= day and o.created_at < day + interval '1 day' and coalesce(o.status, '') <> 'Cancelled'), 0),
    'revenue', coalesce((select sum(o.total) from public.orders o where o.seller_id = p_seller_id and o.created_at >= day and o.created_at < day + interval '1 day' and coalesce(o.status, '') <> 'Cancelled'), 0)
  ) order by day), '[]'::jsonb)
  into daily
  from generate_series(date_trunc('day', period_start), today_start, interval '1 day') day;

  return jsonb_build_object(
    'periodDays', period_days,
    'store', jsonb_build_object(
      'totalFollowers', follower_count,
      'totalFavorites', favorite_count,
      'listingsPublished', listing_count,
      'activePromotions', active_promotion_count
    ),
    'sales', jsonb_build_object(
      'revenueToday', revenue_today,
      'revenueThisWeek', revenue_week,
      'revenueThisMonth', revenue_month,
      'ordersReceived', order_count
    ),
    'listings', jsonb_build_object(
      'views', view_count,
      'favorites', favorite_count,
      'orders', listing_order_count,
      'conversionRate', case when view_count = 0 then 0 else round((listing_order_count::numeric / view_count) * 100, 2) end
    ),
    'promotions', jsonb_build_object(
      'views', promotion_view_count,
      'clicks', promotion_click_count,
      'purchases', promotion_purchase_count,
      'revenue', promotion_revenue
    ),
    'daily', daily
  );
end;
$$;

revoke all on function public.get_vendor_analytics(uuid, integer) from public;
grant execute on function public.get_vendor_analytics(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
