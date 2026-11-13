-- App Store Guideline 5.1.1: guests browse marketplace content without an
-- account. Public seller/member profiles display badges and reputation
-- snapshots, so these tables must be readable by anonymous users as well.
-- Writes remain owner-only.

drop policy if exists "Active badge definitions are viewable by everyone" on badge_definitions;
create policy "Active badge definitions are viewable by everyone"
  on badge_definitions for select
  using (active);

drop policy if exists "User badges are viewable by authenticated users" on user_badges;
create policy "User badges are viewable by everyone"
  on user_badges for select
  using (true);

drop policy if exists "Reputation statuses are viewable by authenticated users" on user_reputation_status;
create policy "Reputation statuses are viewable by everyone"
  on user_reputation_status for select
  using (true);
