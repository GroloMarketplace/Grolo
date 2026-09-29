create table if not exists public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text primary key,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users can manage their own push tokens" on public.push_tokens;
create policy "Users can manage their own push tokens"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
