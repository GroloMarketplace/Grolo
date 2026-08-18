-- Variant listings use seller-managed availability and do not participate in
-- inventory reservation, decrement, or restoration. Single-price listings
-- retain the existing inventory behavior.
create or replace function public.create_order_with_items(
  p_seller_id uuid,
  p_fulfillment_method text default 'pickup',
  p_delivery_fee numeric default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_item jsonb;
  v_listing listings;
  v_listing_id uuid;
  v_legacy_order_id text;
  v_quantity integer;
  v_variant_price numeric(10, 2);
  v_original_price numeric(10, 2);
  v_discounted_price numeric(10, 2);
  v_promotion_id uuid;
  v_promotion_title text;
  v_promotion_type text;
  v_discount_value numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_delivery_fee numeric(10, 2) := coalesce(p_delivery_fee, 0);
  v_has_variants boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Suspended accounts cannot place orders.' using errcode = 'insufficient_privilege';
  end if;
  if p_seller_id is null or not exists (select 1 from profiles where id = p_seller_id) then
    raise exception 'Seller profile not found.' using errcode = 'foreign_key_violation';
  end if;
  if p_fulfillment_method not in ('pickup', 'delivery') then
    raise exception 'Fulfillment method is invalid.' using errcode = 'check_violation';
  end if;
  if v_delivery_fee < 0 then
    raise exception 'Delivery fee cannot be negative.' using errcode = 'check_violation';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required.' using errcode = 'check_violation';
  end if;

  v_legacy_order_id := nullif(p_metadata->>'legacy_order_id', '');
  if v_legacy_order_id is not null then
    select * into v_order from orders
    where buyer_id = auth.uid() and metadata->>'legacy_order_id' = v_legacy_order_id
    for update;
    if found then
      return jsonb_build_object(
        'order', to_jsonb(v_order),
        'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
          from order_items item join listings listing on listing.id = item.listing_id
          where item.order_id = v_order.id), '[]'::jsonb)
      );
    end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Order item quantity is invalid.' using errcode = 'check_violation';
    end if;

    if (v_item->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_listing_id := (v_item->>'listing_id')::uuid;
      select * into v_listing from listings
      where id = v_listing_id and seller_id = p_seller_id and status = 'Active' for update;
    else
      select * into v_listing from listings
      where legacy_id = v_item->>'listing_id' and seller_id = p_seller_id and status = 'Active' for update;
      v_listing_id := v_listing.id;
    end if;
    if not found then
      raise exception 'Order item listing is not owned by the selected seller or is unavailable.'
        using errcode = 'foreign_key_violation';
    end if;

    v_has_variants := case
      when jsonb_typeof(v_listing.metadata->'variants') = 'array' then jsonb_array_length(v_listing.metadata->'variants') > 0
      else false
    end;
    if not v_has_variants and v_listing.inventory_quantity < v_quantity then
      raise exception 'Insufficient inventory for listing %.', v_listing.id using errcode = 'check_violation';
    end if;

    v_variant_price := nullif(v_item->>'variant_price', '')::numeric;
    v_original_price := coalesce(v_variant_price, v_listing.price);
    v_discounted_price := v_original_price;
    v_promotion_id := null;
    v_promotion_title := null;
    v_promotion_type := null;
    v_discount_value := null;
    select id, title, coalesce(promotion_type, discount_type), discount_value
      into v_promotion_id, v_promotion_title, v_promotion_type, v_discount_value
      from promotions
      where seller_id = v_listing.seller_id and status = 'active'
        and current_date >= start_date and (end_date is null or current_date <= end_date)
        and (listing_id = coalesce(v_listing.legacy_id, v_listing.id::text)
          or listing_ids @> jsonb_build_array(coalesce(v_listing.legacy_id, v_listing.id::text))
          or listing_ids @> jsonb_build_array(v_listing.id::text))
      order by created_at desc limit 1;
    if v_promotion_id is not null then
      v_discounted_price := case
        when v_promotion_type = 'percentage' then v_original_price * (1 - least(100, greatest(0, coalesce(v_discount_value, 0))) / 100)
        when v_promotion_type in ('dollar', 'fixed', 'fixed_amount') then v_original_price - greatest(0, coalesce(v_discount_value, 0))
        else v_original_price
      end;
      v_discounted_price := greatest(0, round(v_discounted_price, 2));
    end if;
    v_subtotal := v_subtotal + v_quantity * v_discounted_price;
  end loop;

  insert into orders (buyer_id, seller_id, fulfillment_method, status, subtotal, delivery_fee, total, metadata)
  values (auth.uid(), p_seller_id, p_fulfillment_method, 'Seller Notified', v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee, coalesce(p_metadata, '{}'::jsonb))
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if (v_item->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      v_listing_id := (v_item->>'listing_id')::uuid;
    else
      select id into v_listing_id from listings where legacy_id = v_item->>'listing_id';
    end if;
    select * into v_listing from listings where id = v_listing_id;
    v_has_variants := case
      when jsonb_typeof(v_listing.metadata->'variants') = 'array' then jsonb_array_length(v_listing.metadata->'variants') > 0
      else false
    end;

    v_variant_price := nullif(v_item->>'variant_price', '')::numeric;
    v_original_price := coalesce(v_variant_price, v_listing.price);
    v_discounted_price := v_original_price;
    v_promotion_id := null;
    v_promotion_title := null;
    v_promotion_type := null;
    v_discount_value := null;
    select id, title, coalesce(promotion_type, discount_type), discount_value
      into v_promotion_id, v_promotion_title, v_promotion_type, v_discount_value
      from promotions
      where seller_id = v_listing.seller_id and status = 'active'
        and current_date >= start_date and (end_date is null or current_date <= end_date)
        and (listing_id = coalesce(v_listing.legacy_id, v_listing.id::text)
          or listing_ids @> jsonb_build_array(coalesce(v_listing.legacy_id, v_listing.id::text))
          or listing_ids @> jsonb_build_array(v_listing.id::text))
      order by created_at desc limit 1;
    if v_promotion_id is not null then
      v_discounted_price := case
        when v_promotion_type = 'percentage' then v_original_price * (1 - least(100, greatest(0, coalesce(v_discount_value, 0))) / 100)
        when v_promotion_type in ('dollar', 'fixed', 'fixed_amount') then v_original_price - greatest(0, coalesce(v_discount_value, 0))
        else v_original_price
      end;
      v_discounted_price := greatest(0, round(v_discounted_price, 2));
    end if;
    if not v_has_variants then
      update listings
      set inventory_quantity = inventory_quantity - (v_item->>'quantity')::integer, updated_at = now()
      where id = v_listing.id;
    end if;
    insert into order_items (order_id, listing_id, quantity, unit_price, line_total, original_price, discounted_price, promotion_id, promotion_title, variant_name, variant_price)
    values (v_order.id, v_listing_id, (v_item->>'quantity')::integer, v_discounted_price, (v_item->>'quantity')::integer * v_discounted_price, v_original_price, v_discounted_price, v_promotion_id, v_promotion_title, nullif(v_item->>'variant_name', ''), nullif(v_item->>'variant_price', '')::numeric);
  end loop;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
      from order_items item join listings listing on listing.id = item.listing_id where item.order_id = v_order.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.cancel_order_with_inventory(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order orders;
  v_item record;
  v_has_variants boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;
  if v_order.buyer_id <> auth.uid() then
    raise exception 'Only the buyer can cancel this order.' using errcode = 'insufficient_privilege';
  end if;
  if v_order.status = 'Cancelled' and v_order.inventory_restored then
    return jsonb_build_object(
      'order', to_jsonb(v_order),
      'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
        from order_items item join listings listing on listing.id = item.listing_id where item.order_id = v_order.id), '[]'::jsonb),
      'inventory_already_restored', true
    );
  end if;
  if v_order.status not in ('New', 'Order Placed', 'Seller Notified') then
    raise exception 'This order can no longer be cancelled.' using errcode = 'check_violation';
  end if;

  for v_item in
    select order_items.listing_id, order_items.quantity, order_items.variant_name, listings.metadata
    from order_items join listings on listings.id = order_items.listing_id
    where order_items.order_id = v_order.id
    for update of order_items
  loop
    v_has_variants := v_item.variant_name is not null or case
      when jsonb_typeof(v_item.metadata->'variants') = 'array' then jsonb_array_length(v_item.metadata->'variants') > 0
      else false
    end;
    if not v_has_variants then
      update listings
      set inventory_quantity = inventory_quantity + v_item.quantity, updated_at = now()
      where id = v_item.listing_id;
    end if;
  end loop;

  update orders
  set status = 'Cancelled', inventory_restored = true, updated_at = now()
  where id = v_order.id
  returning * into v_order;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((select jsonb_agg(to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id) order by item.created_at)
      from order_items item join listings listing on listing.id = item.listing_id where item.order_id = v_order.id), '[]'::jsonb),
    'inventory_restored', true
  );
end;
$$;

revoke execute on function public.create_order_with_items(uuid, text, numeric, jsonb, jsonb) from public;
grant execute on function public.create_order_with_items(uuid, text, numeric, jsonb, jsonb) to authenticated;
revoke execute on function public.cancel_order_with_inventory(uuid) from public;
grant execute on function public.cancel_order_with_inventory(uuid) to authenticated;
notify pgrst, 'reload schema';
