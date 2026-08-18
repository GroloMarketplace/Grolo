-- Schema-only compatibility layer for deployments where the order_items
-- pricing columns from the promotion migration were not applied before variant pricing.
-- Historical order_items are immutable and are intentionally not backfilled here.
alter table public.order_items add column if not exists original_price numeric(10, 2);
alter table public.order_items add column if not exists discounted_price numeric(10, 2);
alter table public.order_items add column if not exists promotion_id uuid references public.promotions(id) on delete set null;
alter table public.order_items add column if not exists promotion_title text;
alter table public.order_items add column if not exists variant_name text;
alter table public.order_items add column if not exists variant_price numeric(10, 2);

create or replace function public.populate_order_item_variant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  variant jsonb;
begin
  if new.variant_name is not null or new.variant_price is not null then
    return new;
  end if;

  select value into variant
  from public.orders o,
       jsonb_array_elements(coalesce(o.metadata->'variant_items', '[]'::jsonb)) as entry(value)
  where o.id = new.order_id
    and value->>'listingId' = new.listing_id::text
  limit 1;

  if variant is not null then
    new.variant_name := variant->>'variantName';
    new.variant_price := nullif(variant->>'variantPrice', '')::numeric;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_populate_variant on public.order_items;
create trigger order_items_populate_variant
before insert on public.order_items
for each row execute function public.populate_order_item_variant();

revoke all on function public.populate_order_item_variant() from public;
grant execute on function public.populate_order_item_variant() to authenticated;
notify pgrst, 'reload schema';
