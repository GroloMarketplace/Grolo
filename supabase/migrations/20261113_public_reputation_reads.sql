-- App Store Guideline 5.1.1: guests browse marketplace content without an
-- account. Public seller/member profiles display badges and reputation
-- snapshots, so these tables must be readable by anonymous users as well.
-- Writes remain owner-only.
--
-- Some environments may not have the reputation tables at all, so each
-- policy change is applied only when the table exists.

do $$
begin
  if to_regclass('public.badge_definitions') is not null then
    execute 'drop policy if exists "Active badge definitions are viewable by everyone" on public.badge_definitions';
    execute 'create policy "Active badge definitions are viewable by everyone"
      on public.badge_definitions for select
      using (active)';
  end if;

  if to_regclass('public.user_badges') is not null then
    execute 'drop policy if exists "User badges are viewable by authenticated users" on public.user_badges';
    execute 'drop policy if exists "User badges are viewable by everyone" on public.user_badges';
    execute 'create policy "User badges are viewable by everyone"
      on public.user_badges for select
      using (true)';
  end if;

  if to_regclass('public.user_reputation_status') is not null then
    execute 'drop policy if exists "Reputation statuses are viewable by authenticated users" on public.user_reputation_status';
    execute 'drop policy if exists "Reputation statuses are viewable by everyone" on public.user_reputation_status';
    execute 'create policy "Reputation statuses are viewable by everyone"
      on public.user_reputation_status for select
      using (true)';
  end if;
end $$;
