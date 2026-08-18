-- Add the canonical follower identity fields used by social notifications.
-- These statements are intentionally additive so they are safe on partially
-- migrated notification tables.
alter table public.notifications add column if not exists actor_id uuid;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'actor_avatar_url'
  ) then
    execute 'update public.notifications
             set actor_avatar = coalesce(actor_avatar, actor_avatar_url)
             where actor_avatar is null';
  end if;
end;
$$;

notify pgrst, 'reload schema';
