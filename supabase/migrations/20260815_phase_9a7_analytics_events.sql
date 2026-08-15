-- Phase 9A.7: client analytics event recording and safe attribution.

alter table public.vendor_analytics_events
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.vendor_analytics_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.vendor_analytics_events
  drop constraint if exists vendor_analytics_events_event_type_check;
alter table public.vendor_analytics_events
  add constraint vendor_analytics_events_event_type_check
  check (event_type in (
    'listing_view', 'promotion_view', 'promotion_click',
    'add_to_cart', 'checkout_started', 'order_completed'
  ));

create index if not exists vendor_analytics_events_user_idx
  on public.vendor_analytics_events (user_id, created_at desc);

-- A client can report an event for a seller only when the referenced listing or
-- promotion belongs to that seller. Authenticated events are also attributed to
-- the current user; anonymous events may omit user_id but cannot omit attribution.
drop policy if exists "Sellers can record their analytics events" on public.vendor_analytics_events;
drop policy if exists "Authenticated users can record analytics events" on public.vendor_analytics_events;
drop policy if exists "Guests can record analytics events" on public.vendor_analytics_events;

create policy "Sellers can record their analytics events"
  on public.vendor_analytics_events for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_user_suspended(auth.uid())
    and (listing_id is null or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = seller_id
    ))
    and (promotion_id is null or exists (
      select 1 from public.promotions p
      where p.id = promotion_id and p.seller_id = seller_id
    ))
    and (listing_id is not null or promotion_id is not null or seller_id = auth.uid())
  );

create policy "Guests can record analytics events"
  on public.vendor_analytics_events for insert to anon
  with check (
    user_id is null
    and (listing_id is null or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = seller_id
    ))
    and (promotion_id is null or exists (
      select 1 from public.promotions p
      where p.id = promotion_id and p.seller_id = seller_id
    ))
    and (listing_id is not null or promotion_id is not null)
  );

notify pgrst, 'reload schema';
