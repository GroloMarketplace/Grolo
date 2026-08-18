-- Notify buyers when sellers advance an order through fulfillment.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'highlight', 'follower', 'new_follower', 'listing_favorited',
    'order_received', 'order_created', 'order_status', 'order_preparing',
    'order_ready_for_pickup', 'order_completed', 'review_received',
    'promotion_created', 'new_listing', 'new_message', 'message_received',
    'event_attendance', 'event_rsvp'
  ));

create or replace function public.notify_order_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_type text;
  notification_message text;
  store_name text;
  listing_title text;
  store_avatar text;
begin
  if new.status = old.status or new.buyer_id is null then
    return new;
  end if;

  v_notification_type := case new.status
    when 'Preparing' then 'order_preparing'
    when 'Ready for Pickup' then 'order_ready_for_pickup'
    when 'Completed' then 'order_completed'
    else null
  end;
  if v_notification_type is null then
    return new;
  end if;

  select
    coalesce(p.shop_name, p.display_name, p.username, 'The store'),
    p.avatar_url
  into store_name, store_avatar
  from public.profiles p
  where p.id = new.seller_id;

  select coalesce(l.title, l.name)
    into listing_title
  from public.order_items oi
  join public.listings l on l.id = oi.listing_id
  where oi.order_id = new.id
  order by oi.created_at
  limit 1;

  notification_message := case new.status
    when 'Preparing' then coalesce(store_name, 'The store') || ' has started preparing your order.'
    when 'Ready for Pickup' then 'Your order is ready for pickup.'
    when 'Completed' then 'Your order has been completed.'
  end;

  insert into public.notifications (
    user_id, type, title, message, related_id,
    actor_id, actor_name, actor_avatar, subject_title
  )
  select
    new.buyer_id,
    v_notification_type,
    case new.status
      when 'Preparing' then 'Order Preparing'
      when 'Ready for Pickup' then 'Order Ready for Pickup'
      when 'Completed' then 'Order Completed'
    end,
    notification_message,
    new.id::text,
    new.seller_id,
    store_name,
    store_avatar,
    listing_title
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = new.buyer_id
      and n.type = v_notification_type
      and n.related_id = new.id::text
  );

  return new;
end;
$$;

drop trigger if exists notifications_on_order_status on public.orders;
create trigger notifications_on_order_status
after update of status on public.orders
for each row execute function public.notify_order_status_changed();

revoke all on function public.notify_order_status_changed() from public;
grant execute on function public.notify_order_status_changed() to authenticated;

notify pgrst, 'reload schema';
