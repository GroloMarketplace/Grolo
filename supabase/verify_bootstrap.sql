-- Grolo authoritative bootstrap verification.
-- Run this only after schema.sql and every migration listed in README have
-- completed successfully. The script raises an exception when any required
-- object is missing or when a fresh deployment retains a conflicting legacy
-- notification contract.

create temporary table grolo_bootstrap_checks (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

insert into grolo_bootstrap_checks
select 'table:' || required_name,
       to_regclass('public.' || required_name) is not null,
       case when to_regclass('public.' || required_name) is not null then 'present' else 'missing' end
from (values
  ('profiles'), ('user_follows'), ('events'), ('event_attendees'),
  ('categories'), ('listings'), ('favorites'), ('reviews'),
  ('conversations'), ('messages'), ('comments'), ('comment_likes'),
  ('notifications'), ('orders'), ('order_items'), ('payments'),
  ('reputation_events'), ('badge_definitions'), ('user_badges'),
  ('user_reputation_status'), ('promotions'), ('vendor_analytics_events'),
  ('reports'), ('user_blocks'), ('posts')
) required(required_name);

insert into grolo_bootstrap_checks
select 'column:profiles.' || required_name,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name = required_name
       ),
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name = required_name
       ) then 'present' else 'missing' end
from (values
  ('id'), ('display_name'), ('username'), ('bio'), ('avatar_url'), ('banner_url'),
  ('location'), ('location_radius'), ('latitude'), ('longitude'), ('neighborhood'), ('city'),
  ('province'), ('country'), ('postal_code'), ('location_permission'), ('interests'), ('buyer_notifications'),
  ('seller_notifications'), ('show_location_publicly'), ('shop_name'),
  ('shop_slug'), ('store_description'), ('store_location'), ('vacation_mode'),
  ('vacation_message'), ('return_date'), ('social_links'), ('seller_status'),
  ('store_onboarding_status'), ('store_opened_at'), ('onboarding_completed'),
  ('is_admin'), ('suspended_at')
) required(required_name);

insert into grolo_bootstrap_checks
select 'column:posts.' || required_name,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'posts'
           and column_name = required_name
       ),
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'posts'
           and column_name = required_name
       ) then 'present' else 'missing' end
from (values
  ('id'), ('legacy_id'), ('author_id'), ('seller_id'), ('product_id'),
  ('body'), ('classification'), ('location'), ('latitude'), ('longitude'),
  ('group_name'), ('author_name'), ('author_avatar'), ('image_url'),
  ('image_urls'), ('media'), ('visibility'), ('likes'), ('comments'),
  ('reposts'), ('shares'), ('created_at'), ('updated_at')
) required(required_name);

insert into grolo_bootstrap_checks
select 'column:listings.' || required_name,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'listings'
           and column_name = required_name
       ),
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'listings'
           and column_name = required_name
       ) then 'present' else 'missing' end
from (values
  ('id'), ('seller_id'), ('legacy_id'), ('title'), ('name'), ('description'),
  ('category'), ('subcategory'), ('price'), ('pricing_details'), ('condition'),
  ('inventory_quantity'), ('trade_enabled'), ('pickup_available'),
  ('delivery_available'), ('image_url'), ('image_urls'), ('location'),
  ('neighborhood'), ('city'), ('province'), ('country'), ('postal_code'),
  ('latitude'), ('longitude'), ('status'), ('metadata'), ('search_vector'), ('created_at'), ('updated_at')
) required(required_name);

insert into grolo_bootstrap_checks
select 'column:' || table_name || '.' || column_name,
       exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = required.table_name
           and c.column_name = required.column_name
       ),
       case when exists (
         select 1 from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = required.table_name
           and c.column_name = required.column_name
       ) then 'present' else 'missing' end
from (values
  ('promotions', 'seller_id'), ('promotions', 'listing_id'),
  ('promotions', 'listing_ids'), ('promotions', 'title'),
  ('promotions', 'promotion_type'), ('promotions', 'discount_type'),
  ('promotions', 'discount_value'), ('promotions', 'start_date'),
  ('promotions', 'end_date'), ('promotions', 'status'),
  ('favorites', 'user_id'), ('favorites', 'listing_id'),
  ('user_follows', 'follower_id'), ('user_follows', 'seller_id'),
  ('notifications', 'user_id'), ('notifications', 'type'),
  ('notifications', 'title'), ('notifications', 'message'),
  ('notifications', 'related_id'), ('notifications', 'read'),
  ('reports', 'reporter_id'), ('reports', 'target_type'),
  ('reports', 'target_id'), ('reports', 'reason'), ('reports', 'status'),
  ('user_blocks', 'blocker_id'), ('user_blocks', 'blocked_id'),
  ('vendor_analytics_events', 'seller_id'),
  ('vendor_analytics_events', 'event_type'),
  ('vendor_analytics_events', 'listing_id'),
  ('vendor_analytics_events', 'promotion_id'),
  ('vendor_analytics_events', 'user_id'),
  ('orders', 'buyer_id'), ('orders', 'seller_id'),
  ('orders', 'fulfillment_method'), ('orders', 'status'),
  ('orders', 'subtotal'), ('orders', 'delivery_fee'), ('orders', 'total'),
  ('orders', 'inventory_restored'), ('order_items', 'order_id'),
  ('order_items', 'listing_id'), ('order_items', 'quantity'),
  ('order_items', 'unit_price'), ('order_items', 'line_total'),
  ('order_items', 'original_price'), ('order_items', 'discounted_price'),
  ('order_items', 'promotion_id'), ('payments', 'order_id'),
  ('payments', 'buyer_id'), ('payments', 'seller_id'),
  ('payments', 'amount'), ('payments', 'payment_status')
) required(table_name, column_name);

insert into grolo_bootstrap_checks
select 'rls:' || required_name,
       coalesce((select c.relrowsecurity from pg_class c
                 join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'public' and c.relname = required_name), false),
       case when coalesce((select c.relrowsecurity from pg_class c
                           join pg_namespace n on n.oid = c.relnamespace
                           where n.nspname = 'public' and c.relname = required_name), false)
            then 'enabled' else 'disabled' end
from (values
  ('profiles'), ('user_follows'), ('events'), ('event_attendees'),
  ('categories'), ('listings'), ('favorites'), ('reviews'),
  ('conversations'), ('messages'), ('comments'), ('comment_likes'),
  ('notifications'), ('orders'), ('order_items'), ('payments'),
  ('reputation_events'), ('badge_definitions'), ('user_badges'),
  ('user_reputation_status'), ('promotions'), ('vendor_analytics_events'),
  ('reports'), ('user_blocks'), ('posts')
) required(required_name);

insert into grolo_bootstrap_checks
select 'function:' || required_name,
       to_regprocedure(signature) is not null,
       case when to_regprocedure(signature) is not null then 'present' else 'missing' end
from (values
  ('is_user_blocked', 'public.is_user_blocked(uuid,uuid)'),
  ('admin_set_report_status', 'public.admin_set_report_status(uuid,text)'),
  ('admin_suspend_target', 'public.admin_suspend_target(text,text,boolean)'),
  ('validate_promotion_fields', 'public.validate_promotion_fields()'),
  ('validate_profile_fields', 'public.validate_profile_fields()'),
  ('validate_listing_fields', 'public.validate_listing_fields()'),
  ('validate_order_checkout_fields', 'public.validate_order_checkout_fields()'),
  ('is_user_suspended', 'public.is_user_suspended(uuid)'),
  ('get_vendor_analytics', 'public.get_vendor_analytics(uuid,integer)'),
  ('get_follower_counts', 'public.get_follower_counts()'),
  ('create_activity_notification', 'public.create_activity_notification(uuid,text,text,text,text)'),
  ('create_review', 'public.create_review(text,smallint,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)'),
  ('upsert_conversation', 'public.upsert_conversation(uuid,text,uuid,uuid,jsonb)'),
  ('create_order_with_items', 'public.create_order_with_items(uuid,text,numeric,jsonb,jsonb)'),
  ('cancel_order_with_inventory', 'public.cancel_order_with_inventory(uuid)'),
  ('update_order_status', 'public.update_order_status(uuid,text)')
) required(required_name, signature);

insert into grolo_bootstrap_checks
select 'constraint:' || required_name,
       exists (select 1 from pg_constraint c
               join pg_class r on r.oid = c.conrelid
               join pg_namespace n on n.oid = r.relnamespace
               where n.nspname = 'public' and c.conname = required_name),
       case when exists (select 1 from pg_constraint c
                         join pg_class r on r.oid = c.conrelid
                         join pg_namespace n on n.oid = r.relnamespace
                         where n.nspname = 'public' and c.conname = required_name)
            then 'present' else 'missing' end
from (values
  ('reviews_review_type_check'), ('reviews_criteria_object_check'),
  ('reviews_photos_array_check'), ('reviews_status_check'),
  ('conversations_type_check'), ('conversations_metadata_object_check'),
  ('conversations_distinct_participants_check'),
  ('conversations_context_check'), ('notifications_type_check'),
  ('orders_status_check'), ('promotions_promotion_type_check'),
  ('promotions_discount_type_check'), ('reports_target_type_check'), ('reports_reason_check'),
  ('reports_status_check')
) required(required_name);

insert into grolo_bootstrap_checks
select 'trigger:' || required_name,
       exists (select 1 from pg_trigger t
               join pg_class c on c.oid = t.tgrelid
               join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and t.tgname = required_name
                 and not t.tgisinternal),
       case when exists (select 1 from pg_trigger t
                         join pg_class c on c.oid = t.tgrelid
                         join pg_namespace n on n.oid = c.relnamespace
                         where n.nspname = 'public' and t.tgname = required_name
                           and not t.tgisinternal)
            then 'present' else 'missing' end
from (values
  ('protect_conversation_fields_trigger'), ('prevent_message_mutation_trigger'),
  ('maintain_conversation_from_message_trigger'),
  ('protect_review_immutable_fields_trigger'), ('reviews_set_updated_at'),
  ('orders_set_updated_at'), ('order_items_set_updated_at'),
  ('conversations_set_updated_at'), ('protect_order_immutable_fields_trigger'),
  ('prevent_order_item_updates_trigger'), ('validate_promotion_fields_trigger'),
  ('validate_profile_fields_trigger'), ('validate_listing_fields_trigger'),
  ('validate_order_checkout_fields_trigger'),
  ('protect_profile_moderation_fields_trigger'), ('notifications_on_follow'),
  ('notifications_on_favorite'), ('notifications_on_order'),
  ('notifications_on_review'), ('notifications_on_promotion'),
  ('notifications_on_listing'), ('notifications_on_order_status')
) required(required_name);

insert into grolo_bootstrap_checks
select 'policy:' || required_name,
       exists (select 1 from pg_policies where schemaname = required.schema_name and policyname = required_name),
       case when exists (select 1 from pg_policies where schemaname = required.schema_name and policyname = required_name)
            then 'present' else 'missing' end
from (values
  ('public', 'Profiles are viewable by everyone'),
  ('public', 'Users can update their own profile'),
  ('public', 'Users can insert their own profile'),
  ('public', 'Follows are viewable by everyone'),
  ('public', 'Users can manage their own follows'),
  ('public', 'Events are viewable by everyone'),
  ('public', 'Sellers can manage their own events'),
  ('public', 'Event attendance is viewable by everyone'),
  ('public', 'Users can manage their own event attendance'),
  ('public', 'Categories are viewable by everyone'),
  ('public', 'Listings are viewable by everyone'),
  ('public', 'Sellers can manage their own listings'),
  ('public', 'Promotions are viewable by everyone'),
  ('public', 'Sellers can manage their own promotions'),
  ('public', 'Users can view their own favorites'),
  ('public', 'Users can manage their own favorites'),
  ('public', 'Reviews are viewable by everyone'),
  ('public', 'Users can update their own review content'),
  ('public', 'Participants can view their conversations'),
  ('public', 'Buyers can create conversations'),
  ('public', 'Participants can update conversations'),
  ('public', 'Participants can view messages'),
  ('public', 'Participants can send messages'),
  ('public', 'Users can view comments'),
  ('public', 'Users can create their own comments'),
  ('public', 'Users can view comment likes'),
  ('public', 'Users can manage their comment likes'),
  ('public', 'Users can view their own notifications'),
  ('public', 'Users can mark their own notifications read'),
  ('public', 'Buyers can read their own orders'),
  ('public', 'Sellers can read orders containing their listings'),
  ('public', 'Buyers can read items in their orders'),
  ('public', 'Sellers can read items for their listings'),
  ('public', 'Users can view related payments'),
  ('public', 'Buyers can create their own payments'),
  ('public', 'Payment status is service managed'),
  ('public', 'Active badge definitions are viewable by everyone'),
  ('public', 'User badges are viewable by authenticated users'),
  ('public', 'Users can award their own badges'),
  ('public', 'Users can update their own badges'),
  ('public', 'Reputation statuses are viewable by authenticated users'),
  ('public', 'Users can create their own reputation statuses'),
  ('public', 'Users can update their own reputation statuses'),
  ('public', 'Users can create their own reports'),
  ('public', 'Users can view their own reports'),
  ('public', 'Admins can update reports'),
  ('public', 'Users can manage their own blocks'),
  ('public', 'Users can see blocks affecting them'),
  ('public', 'Sellers can view their analytics events'),
  ('public', 'Sellers can record their analytics events'),
  ('storage', 'Grolo users can upload own images'),
  ('storage', 'Grolo users can update own images'),
  ('storage', 'Grolo users can delete own images')
) required(schema_name, required_name);

insert into grolo_bootstrap_checks
select 'index:' || required_name,
       to_regclass('public.' || required_name) is not null,
       case when to_regclass('public.' || required_name) is not null then 'present' else 'missing' end
from (values
  ('listings_search_idx'), ('listings_seller_idx'), ('listings_status_idx'),
  ('promotions_seller_idx'), ('promotions_dates_idx'),
  ('user_follows_follower_seller_idx'), ('user_follows_seller_idx'),
  ('user_follows_follower_idx'),
  ('notifications_user_created_idx'), ('notifications_unread_idx'),
  ('vendor_analytics_events_seller_idx'), ('reports_status_created_idx'),
  ('user_blocks_blocker_idx'), ('orders_buyer_idx'), ('orders_seller_idx'),
  ('order_items_order_idx'), ('payments_buyer_idx'), ('payments_seller_idx')
) required(required_name);

-- A clean bootstrap must use the canonical contracts. Existing databases may
-- retain legacy columns only when they are nullable and therefore cannot block
-- canonical inserts.
insert into grolo_bootstrap_checks
select 'contract:user_follows_vendor_id_nullable',
       not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'user_follows'
                     and column_name = 'vendor_id')
       or exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'user_follows'
                    and column_name = 'vendor_id' and is_nullable = 'YES'),
       case when not exists (select 1 from information_schema.columns
                             where table_schema = 'public' and table_name = 'user_follows'
                               and column_name = 'vendor_id')
            then 'not present' else 'nullable legacy field' end;

insert into grolo_bootstrap_checks
select 'contract:notifications_recipient_id_nullable',
       not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'notifications'
                     and column_name = 'recipient_id')
       or exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'notifications'
                    and column_name = 'recipient_id' and is_nullable = 'YES'),
       case when not exists (select 1 from information_schema.columns
                             where table_schema = 'public' and table_name = 'notifications'
                               and column_name = 'recipient_id')
            then 'not present' else 'nullable legacy field' end;

insert into grolo_bootstrap_checks
select 'contract:notifications_action_nullable',
       not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'notifications'
                     and column_name = 'action')
       or exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'notifications'
                    and column_name = 'action' and is_nullable = 'YES'),
       case when not exists (select 1 from information_schema.columns
                             where table_schema = 'public' and table_name = 'notifications'
                               and column_name = 'action')
            then 'not present' else 'nullable legacy field' end;

insert into grolo_bootstrap_checks
select 'contract:orders_no_direct_status_policy',
       not exists (select 1 from pg_policies
                   where schemaname = 'public'
                     and tablename = 'orders'
                     and policyname = 'Sellers can update their own order statuses'),
       case when not exists (select 1 from pg_policies
                             where schemaname = 'public'
                               and tablename = 'orders'
                               and policyname = 'Sellers can update their own order statuses')
            then 'RPC-only status updates' else 'direct update policy remains' end;

insert into grolo_bootstrap_checks
select 'contract:orders_authenticated_update_revoked',
       not has_table_privilege('authenticated', 'public.orders', 'UPDATE'),
       case when not has_table_privilege('authenticated', 'public.orders', 'UPDATE')
            then 'UPDATE privilege revoked' else 'UPDATE privilege remains' end;

DO $$
DECLARE
  failures text;
BEGIN
  SELECT string_agg(check_name || ' (' || detail || ')', E'\n' ORDER BY check_name)
    INTO failures
  FROM grolo_bootstrap_checks
  WHERE not passed;

  IF failures IS NOT NULL THEN
    RAISE EXCEPTION 'Grolo Supabase bootstrap verification failed:\n%', failures;
  END IF;

  RAISE NOTICE 'Grolo Supabase bootstrap verification passed: % checks.',
    (SELECT count(*) FROM grolo_bootstrap_checks);
END;
$$;
