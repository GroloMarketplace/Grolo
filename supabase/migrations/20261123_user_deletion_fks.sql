-- Allow Supabase Auth user deletion to cascade cleanly.
--
-- Deleting auth.users cascades to profiles, but profiles deletion was
-- blocked by RESTRICT foreign keys on orders.seller_id and
-- payments.seller_id, by a NO ACTION foreign key on
-- trade_proposals.accepted_by, and by order_items.listing_id RESTRICT
-- (profile deletion cascades to listings). Convert them to
-- ON DELETE SET NULL so financial/order history is preserved while the
-- deleted user's references are cleared.

alter table public.orders alter column seller_id drop not null;
alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders
  add constraint orders_seller_id_fkey
  foreign key (seller_id) references public.profiles(id) on delete set null;

alter table if exists public.payments alter column seller_id drop not null;
alter table if exists public.payments drop constraint if exists payments_seller_id_fkey;
alter table if exists public.payments
  add constraint payments_seller_id_fkey
  foreign key (seller_id) references public.profiles(id) on delete set null;

alter table public.trade_proposals drop constraint if exists trade_proposals_accepted_by_fkey;
alter table public.trade_proposals
  add constraint trade_proposals_accepted_by_fkey
  foreign key (accepted_by) references auth.users(id) on delete set null;

-- Deleting a profile cascades to their listings, which was blocked by
-- order_items.listing_id RESTRICT. Clear the reference instead so order
-- history survives listing deletion.
alter table public.order_items alter column listing_id drop not null;
alter table public.order_items drop constraint if exists order_items_listing_id_fkey;
alter table public.order_items
  add constraint order_items_listing_id_fkey
  foreign key (listing_id) references public.listings(id) on delete set null;
