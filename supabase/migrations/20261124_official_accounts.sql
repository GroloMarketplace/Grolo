-- Official Grolo Marketplace accounts.
-- is_official is the single source of truth for the verified badge and
-- feed-visibility override; it supports any number of official accounts.
alter table profiles add column if not exists is_official boolean not null default false;

-- Flag the Grolo Marketplace official account by email (never by username).
update profiles p
set is_official = true
from auth.users u
where p.id = u.id
  and lower(u.email) = 'larissa@grolomarketplace.ca';
