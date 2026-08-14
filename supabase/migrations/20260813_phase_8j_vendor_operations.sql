-- Phase 8J: buyer notifications for seller fulfillment status changes.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
  ) then
    alter table public.notifications drop constraint notifications_type_check;
    alter table public.notifications add constraint notifications_type_check
      check (type in ('highlight', 'follower', 'new_follower', 'listing_favorited', 'order_received', 'order_status', 'review_received', 'promotion_created', 'new_listing'));
  end if;
end;
$$;

create or replace function public.notify_order_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_activity_notification(
    new.seller_id,
    'order_received',
    'Order received',
    'You received a new order.',
    new.id::text
  );
  perform public.create_activity_notification(
    new.buyer_id,
    'order_status',
    'Order received',
    'Your order has been received by the seller.',
    new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_order_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status_message text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  status_message := case new.status
    when 'Preparing' then 'Your order is being prepared.'
    when 'In Progress' then 'Your order is being prepared.'
    when 'Ready for Pickup' then 'Your order is ready for pickup.'
    when 'Completed' then 'Your order has been completed.'
    when 'Delivered' then 'Your order has been delivered.'
    when 'Out for Delivery' then 'Your order is out for delivery.'
    else 'Your order status changed to ' || coalesce(new.status, 'updated') || '.'
  end;

  perform public.create_activity_notification(
    new.buyer_id,
    'order_status',
    'Order update',
    status_message,
    new.id::text
  );
  return new;
end;
$$;

drop trigger if exists notifications_on_order_status on public.orders;
create trigger notifications_on_order_status
after update of status on public.orders
for each row execute function public.notify_order_status_changed();

notify pgrst, 'reload schema';
