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
