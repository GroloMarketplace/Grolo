-- Unified user-generated content reporting for Apple Guideline 1.2 compliance.
create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  target_type text,
  target_id text,
  reason text not null,
  details text not null default '',
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

alter table public.reports
  add column if not exists updated_at timestamptz default now();

alter table public.reports
  add column if not exists reporter_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists reported_user_id uuid references auth.users(id) on delete set null,
  add column if not exists content_type text,
  add column if not exists content_id text,
  add column if not exists optional_description text not null default '';

alter table public.reports alter column target_type drop not null;
alter table public.reports alter column target_id drop not null;

update public.reports
set reporter_user_id = coalesce(reporter_user_id, reporter_id),
    content_type = coalesce(content_type, target_type),
    content_id = coalesce(content_id, target_id),
    optional_description = coalesce(optional_description, details, '')
where reporter_user_id is null or content_type is null or content_id is null;

update public.reports r
set reported_user_id = r.content_id::uuid
where r.content_type = 'user'
  and r.reported_user_id is null
  and r.content_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports drop constraint if exists reports_reason_check;

update public.reports
set reason = case reason
  when 'fraud' then 'fraud_scam'
  when 'inappropriate_content' then 'explicit_inappropriate'
  when 'harassment' then 'harassment_bullying'
  when 'misleading_listing' then 'other'
  else reason
end;

alter table public.reports alter column reporter_user_id set not null;
alter table public.reports alter column content_type set not null;
alter table public.reports alter column content_id set not null;

alter table public.reports add constraint reports_content_type_check check (content_type in ('user', 'listing', 'post', 'review', 'message', 'event'));
alter table public.reports add constraint reports_reason_check check (reason in ('spam', 'harassment_bullying', 'hate_speech', 'fraud_scam', 'explicit_inappropriate', 'illegal_goods_services', 'other'));

create unique index if not exists reports_reporter_content_unique_idx
  on public.reports (reporter_user_id, content_type, content_id);
create index if not exists reports_content_idx on public.reports (content_type, content_id, created_at desc);

alter table public.reports enable row level security;
drop policy if exists "Users can create their own reports" on public.reports;
create policy "Users can create their own reports" on public.reports for insert to authenticated
  with check (auth.uid() = reporter_user_id);

drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports" on public.reports for select to authenticated
  using (auth.uid() = reporter_user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

notify pgrst, 'reload schema';
