create table if not exists public.hidden_content (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null,
  content_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);

create index if not exists hidden_content_user_idx on public.hidden_content (user_id, created_at desc);
alter table public.hidden_content enable row level security;
grant select, insert, delete on public.hidden_content to authenticated;
drop policy if exists "Users can manage their own hidden content" on public.hidden_content;
create policy "Users can manage their own hidden content" on public.hidden_content for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
