-- Variant listings use seller-managed availability. Prevent unavailable
-- variant listings from being purchased even if a client bypasses the UI.
create or replace function public.enforce_variant_listing_availability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_listing listings;
  v_has_variants boolean;
begin
  select * into v_listing from listings where id = new.listing_id;
  if not found then
    return new;
  end if;

  v_has_variants := case
    when jsonb_typeof(v_listing.metadata->'variants') = 'array' then jsonb_array_length(v_listing.metadata->'variants') > 0
    else false
  end;
  if v_has_variants and coalesce(v_listing.metadata->>'availableForOrders', 'true') = 'false' then
    raise exception 'This variant listing is unavailable for orders.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_enforce_variant_availability on public.order_items;
create trigger order_items_enforce_variant_availability
before insert on public.order_items
for each row execute function public.enforce_variant_listing_availability();

revoke all on function public.enforce_variant_listing_availability() from public;
grant execute on function public.enforce_variant_listing_availability() to authenticated;
notify pgrst, 'reload schema';
