alter table public.profiles
  add column if not exists founding_member boolean not null default false;
