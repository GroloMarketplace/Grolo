-- Phase 8K: trust, safety, reporting, blocking, and moderation.

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists suspended_at timestamptz;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'message')),
  target_id text not null,
  reason text not null check (reason in ('spam', 'fraud', 'inappropriate_content', 'harassment', 'misleading_listing')),
  details text not null default '',
  status text not null default 'Open' check (status in ('Open', 'Under Review', 'Resolved', 'Dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);

alter table public.reports enable row level security;
drop policy if exists "Users can create their own reports" on public.reports;
create policy "Users can create their own reports" on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);
drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports" on public.reports for select to authenticated
  using (auth.uid() = reporter_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports" on public.reports for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id, created_at desc);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id, created_at desc);

alter table public.user_blocks enable row level security;
drop policy if exists "Users can manage their own blocks" on public.user_blocks;
create policy "Users can manage their own blocks" on public.user_blocks for all to authenticated
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);
drop policy if exists "Users can see blocks affecting them" on public.user_blocks;
create policy "Users can see blocks affecting them" on public.user_blocks for select to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create or replace function public.is_user_blocked(p_first_user_id uuid, p_second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_first_user_id and blocked_id = p_second_user_id)
       or (blocker_id = p_second_user_id and blocked_id = p_first_user_id)
  );
$$;

revoke all on function public.is_user_blocked(uuid, uuid) from public;
grant execute on function public.is_user_blocked(uuid, uuid) to authenticated;

create or replace function public.admin_set_report_status(p_report_id uuid, p_status text)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare result public.reports;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin access required.' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('Open', 'Under Review', 'Resolved', 'Dismissed') then
    raise exception 'Invalid report status.' using errcode = 'check_violation';
  end if;
  update public.reports set status = p_status where id = p_report_id returning * into result;
  return result;
end;
$$;

revoke all on function public.admin_set_report_status(uuid, text) from public;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;

create or replace function public.admin_suspend_target(p_target_type text, p_target_id text, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin access required.' using errcode = 'insufficient_privilege';
  end if;
  if p_target_type = 'user' then
    update public.profiles set suspended_at = case when p_suspended then now() else null end where id = p_target_id::uuid;
  elsif p_target_type = 'listing' then
    update public.listings set status = case when p_suspended then 'Suspended' else 'Active' end, updated_at = now() where id::text = p_target_id or legacy_id = p_target_id;
  else
    raise exception 'Only users and listings can be suspended.' using errcode = 'check_violation';
  end if;
end;
$$;

revoke all on function public.admin_suspend_target(text, text, boolean) from public;
grant execute on function public.admin_suspend_target(text, text, boolean) to authenticated;

-- Blocked users cannot create conversations/messages with each other.
drop policy if exists "Buyers can create conversations" on public.conversations;
create policy "Buyers can create conversations" on public.conversations for insert to authenticated
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and not public.is_user_blocked(buyer_id, seller_id)
  );
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and public.is_user_blocked(c.buyer_id, c.seller_id)
    )
  );

notify pgrst, 'reload schema';
