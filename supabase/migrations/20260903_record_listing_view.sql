-- Allow viewers to record listing views without granting them direct analytics-table access.

create or replace function public.record_listing_view(
  p_listing_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_seller_id uuid;
begin
  select seller_id into listing_seller_id
  from public.listings
  where id = p_listing_id
    and coalesce(status, 'Active') in ('Active', 'active', 'Published', 'published');

  if listing_seller_id is null then
    return false;
  end if;

  insert into public.vendor_analytics_events (seller_id, listing_id, event_type, user_id, metadata)
  values (listing_seller_id, p_listing_id, 'listing_view', auth.uid(), coalesce(p_metadata, '{}'::jsonb));

  return true;
end;
$$;

revoke all on function public.record_listing_view(uuid, jsonb) from public;
grant execute on function public.record_listing_view(uuid, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
