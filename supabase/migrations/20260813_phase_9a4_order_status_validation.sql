-- Phase 9A.4: server-side order status validation.
-- Sellers may update fulfillment status only through update_order_status().
-- Buyers continue to use cancel_order_with_inventory() for eligible cancellations.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass
      and conname = 'orders_status_check'
  ) then
    alter table public.orders add constraint orders_status_check
      check (status in (
        'New', 'Order Placed', 'Seller Notified', 'Preparing', 'In Progress',
        'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Completed',
        'Cancelled'
      ));
  end if;
end;
$$;

-- Remove the direct update path. The security-definer function below performs
-- its own auth.uid(), ownership, status, and fulfillment workflow checks.
drop policy if exists "Sellers can update their own order statuses" on public.orders;
revoke update on public.orders from public, anon, authenticated;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Suspended accounts cannot update orders.' using errcode = 'insufficient_privilege';
  end if;

  if p_status is null or p_status not in (
    'New', 'Order Placed', 'Seller Notified', 'Preparing', 'In Progress',
    'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Completed'
  ) then
    raise exception 'Order status is unsupported.' using errcode = 'check_violation';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'no_data_found';
  end if;

  if v_order.seller_id <> auth.uid() then
    raise exception 'Only the seller can update this order status.' using errcode = 'insufficient_privilege';
  end if;

  if v_order.status in ('Cancelled', 'Completed') then
    raise exception 'This order can no longer be updated.' using errcode = 'check_violation';
  end if;

  if v_order.fulfillment_method = 'delivery' then
    if not (
      (v_order.status in ('New', 'Order Placed', 'Seller Notified') and p_status = 'Preparing')
      or (v_order.status in ('Preparing', 'In Progress') and p_status = 'Out for Delivery')
      or (v_order.status = 'Out for Delivery' and p_status = 'Delivered')
      or (v_order.status = 'Delivered' and p_status = 'Completed')
    ) then
      raise exception 'Invalid delivery order status transition from % to %.', v_order.status, p_status
        using errcode = 'check_violation';
    end if;
  else
    if not (
      (v_order.status in ('New', 'Order Placed') and p_status = 'Preparing')
      or (v_order.status = 'Seller Notified' and p_status = 'In Progress')
      or (v_order.status = 'Preparing' and p_status = 'Ready for Pickup')
      or (v_order.status = 'In Progress' and p_status = 'Ready for Pickup')
      or (v_order.status = 'Ready for Pickup' and p_status = 'Completed')
    ) then
      raise exception 'Invalid pickup order status transition from % to %.', v_order.status, p_status
        using errcode = 'check_violation';
    end if;
  end if;

  update public.orders
  set status = p_status,
      updated_at = now()
  where id = v_order.id;

  select count(*) into v_item_count
  from public.order_items
  where order_id = v_order.id;

  select * into v_order
  from public.orders
  where id = v_order.id;

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'items', coalesce((
      select jsonb_agg(
        to_jsonb(item) || jsonb_build_object('product_id', listing.legacy_id)
        order by item.created_at
      )
      from public.order_items item
      join public.listings listing on listing.id = item.listing_id
      where item.order_id = v_order.id
    ), '[]'::jsonb),
    'item_count', v_item_count
  );
end;
$$;

revoke all on function public.update_order_status(uuid, text) from public;
grant execute on function public.update_order_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
