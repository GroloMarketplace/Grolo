-- Phase 9A.9: aggregate APIs for scale-sensitive reads.

create index if not exists notifications_user_read_created_idx
  on public.notifications (user_id, read, created_at desc);
create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create index if not exists listings_status_created_idx
  on public.listings (status, created_at desc);

create or replace function public.get_follower_counts()
returns table(seller_id text, follower_count bigint)
language sql
security definer
set search_path = public
as $$
  select f.seller_id, count(*)::bigint
  from public.user_follows f
  group by f.seller_id;
$$;

revoke all on function public.get_follower_counts() from public;
grant execute on function public.get_follower_counts() to anon, authenticated;

notify pgrst, 'reload schema';
