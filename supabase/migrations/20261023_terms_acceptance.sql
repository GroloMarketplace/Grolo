-- Require an explicit acceptance of the current legal agreements.
alter table public.profiles
  add column if not exists accepted_terms boolean not null default false,
  add column if not exists accepted_terms_at timestamptz;

comment on column public.profiles.accepted_terms is 'Whether the user accepted the current Terms of Use, Privacy Policy, and Community Guidelines.';
comment on column public.profiles.accepted_terms_at is 'Time at which the user accepted the current legal agreements.';
