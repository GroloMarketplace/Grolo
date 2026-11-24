-- Allow Supabase Auth user deletion to complete.
--
-- The FK migration (20261123_user_deletion_fks) converts blocking
-- constraints to ON DELETE SET NULL / CASCADE, but three immutability
-- triggers still reject the resulting writes:
--   * protect_order_immutable_fields blocks orders.seller_id -> NULL
--   * prevent_order_item_updates blocks order_items.listing_id -> NULL
--     and cascade deletes of order_items when their order is deleted
--   * prevent_message_mutation blocks cascade deletes of messages when
--     the sender's profile or conversation is deleted
--
-- Each function is relaxed only for the exact referential-action case:
-- the change is permitted solely when the referenced row no longer
-- exists, so direct tampering via the API remains blocked.

create or replace function protect_order_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if (new.buyer_id is distinct from old.buyer_id
    or (new.seller_id is distinct from old.seller_id
        and not (new.seller_id is null
                 and old.seller_id is not null
                 and not exists (select 1 from public.profiles p where p.id = old.seller_id)))
    or new.subtotal is distinct from old.subtotal
    or new.delivery_fee is distinct from old.delivery_fee
    or new.total is distinct from old.total
    or new.fulfillment_method is distinct from old.fulfillment_method
    or new.created_at is distinct from old.created_at
    or new.metadata is distinct from old.metadata)
  then
    raise exception 'Order ownership, fulfillment, totals, and metadata are immutable after creation.'
      using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status
    and new.status = 'Cancelled'
    and current_user = session_user
  then
    raise exception 'Orders can only be cancelled by the buyer cancellation operation.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.inventory_restored is distinct from old.inventory_restored
    and current_user = session_user
  then
    raise exception 'inventory_restored can only be changed by the cancellation operation.'
      using errcode = 'insufficient_privilege';
  end if;

  if old.inventory_restored and not new.inventory_restored then
    raise exception 'inventory_restored cannot be reset.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace function prevent_order_item_updates()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    -- Permit only the FK SET NULL when the referenced listing was deleted;
    -- every other column must be unchanged (updated_at is managed by its
    -- own trigger and is excluded).
    if new.listing_id is null
      and old.listing_id is not null
      and not exists (select 1 from public.listings l where l.id = old.listing_id)
      and (to_jsonb(new) - 'listing_id' - 'updated_at')
        = (to_jsonb(old) - 'listing_id' - 'updated_at')
    then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    -- Permit cascade deletes when the parent order is already gone.
    if not exists (select 1 from public.orders o where o.id = old.order_id) then
      return old;
    end if;
  end if;

  raise exception 'Order items are immutable after creation.'
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function prevent_message_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    -- Permit cascade deletes when the sender's profile or the parent
    -- conversation no longer exists.
    if not exists (select 1 from public.profiles p where p.id = old.sender_id)
      or not exists (select 1 from public.conversations c where c.id = old.conversation_id)
    then
      return old;
    end if;
  end if;

  raise exception 'Messages are immutable after creation.'
    using errcode = 'insufficient_privilege';
end;
$$;
