-- Restore the trust-safety RPC required by the message send block check.
create or replace function public.is_user_blocked(p_first_user_id uuid, p_second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = p_first_user_id and blocked_id = p_second_user_id)
       or (blocker_id = p_second_user_id and blocked_id = p_first_user_id)
  );
$$;

revoke all on function public.is_user_blocked(uuid, uuid) from public;
grant execute on function public.is_user_blocked(uuid, uuid) to authenticated;
