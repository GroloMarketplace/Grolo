-- Notify every admin in-app when a new report is submitted.
create table if not exists public.moderation_notifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_type text not null,
  content_id text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  unique (report_id, admin_user_id)
);

create index if not exists moderation_notifications_admin_created_idx
  on public.moderation_notifications (admin_user_id, created_at desc);
create index if not exists moderation_notifications_unread_idx
  on public.moderation_notifications (admin_user_id, read, created_at desc);

alter table public.moderation_notifications enable row level security;
drop policy if exists "Admins can view moderation notifications" on public.moderation_notifications;
create policy "Admins can view moderation notifications"
  on public.moderation_notifications for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists "Admins can update moderation notifications" on public.moderation_notifications;
create policy "Admins can update moderation notifications"
  on public.moderation_notifications for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create or replace function public.notify_admins_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.moderation_notifications (
    report_id,
    admin_user_id,
    reason,
    reporter_user_id,
    reported_user_id,
    content_type,
    content_id
  )
  select
    new.id,
    p.id,
    new.reason,
    new.reporter_user_id,
    new.reported_user_id,
    new.content_type,
    new.content_id
  from public.profiles p
  where p.is_admin
  on conflict (report_id, admin_user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.notify_admins_on_report() from public;

drop trigger if exists reports_create_moderation_notifications on public.reports;
create trigger reports_create_moderation_notifications
after insert on public.reports
for each row execute function public.notify_admins_on_report();

notify pgrst, 'reload schema';
