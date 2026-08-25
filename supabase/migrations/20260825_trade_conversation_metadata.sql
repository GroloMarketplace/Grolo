alter table public.conversations
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'highlight', 'follower', 'new_follower', 'listing_favorited',
    'order_received', 'order_created', 'order_status', 'order_preparing',
    'order_ready_for_pickup', 'order_completed', 'review_received',
    'promotion_created', 'new_listing', 'new_message', 'message_received',
    'event_attendance', 'event_rsvp', 'trade_proposal'
  ));
