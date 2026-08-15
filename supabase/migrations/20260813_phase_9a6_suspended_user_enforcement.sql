-- Phase 9A.6: enforce suspended-user access restrictions.

create or replace function public.is_user_suspended(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce((select suspended_at is not null from public.profiles where id = p_user_id), false);
$$;

revoke all on function public.is_user_suspended(uuid) from public;
grant execute on function public.is_user_suspended(uuid) to authenticated;

create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.suspended_at is distinct from old.suspended_at
      or new.is_admin is distinct from old.is_admin)
    and current_user not in ('postgres', 'service_role', 'supabase_admin')
    and coalesce(auth.jwt()->>'role', '') not in ('service_role', 'admin', 'moderator')
  then
    raise exception 'Profile moderation fields can only be changed by an administrator.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_moderation_fields_trigger on public.profiles;
create trigger protect_profile_moderation_fields_trigger
before update on public.profiles
for each row execute function public.protect_profile_moderation_fields();

-- Suspended users can remain signed in long enough to receive this page, but
-- cannot use transactional or community write paths.
drop policy if exists "Users can manage their own follows" on public.user_follows;
create policy "Users can manage their own follows"
  on public.user_follows for all
  using (auth.uid() = follower_id and not public.is_user_suspended(auth.uid()))
  with check (auth.uid() = follower_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites"
  on public.favorites for all
  using (auth.uid() = user_id and not public.is_user_suspended(auth.uid()))
  with check (auth.uid() = user_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Sellers can manage their own listings" on public.listings;
create policy "Sellers can manage their own listings"
  on public.listings for all
  using (auth.uid() = seller_id and not public.is_user_suspended(auth.uid()))
  with check (auth.uid() = seller_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Sellers can manage their own promotions" on public.promotions;
create policy "Sellers can manage their own promotions"
  on public.promotions for all to authenticated
  using (auth.uid() = seller_id and not public.is_user_suspended(auth.uid()))
  with check (auth.uid() = seller_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Users can create their own reports" on public.reports;
create policy "Users can create their own reports"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Sellers can record their analytics events" on public.vendor_analytics_events;
create policy "Sellers can record their analytics events"
  on public.vendor_analytics_events for insert to authenticated
  with check (auth.uid() = seller_id and not public.is_user_suspended(auth.uid()));

drop policy if exists "Buyers can create their own payments" on public.payments;
create policy "Buyers can create their own payments"
  on public.payments for insert to authenticated
  with check (auth.uid() = buyer_id and not public.is_user_suspended(auth.uid()));

-- Preserve the full conversation ownership checks while adding suspension and
-- block enforcement for both direct inserts and the conversation RPC.
drop policy if exists "Buyers can create conversations" on public.conversations;
create policy "Buyers can create conversations"
  on public.conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and not public.is_user_suspended(auth.uid())
    and not public.is_user_blocked(buyer_id, seller_id)
    and (
      listing_id is null
      or exists (
        select 1 from public.listings l
        where l.id = listing_id and l.seller_id = seller_id
      )
    )
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = order_id
          and o.buyer_id = buyer_id
          and o.seller_id = seller_id
      )
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_user_suspended(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and not public.is_user_blocked(c.buyer_id, c.seller_id)
    )
  );

notify pgrst, 'reload schema';
