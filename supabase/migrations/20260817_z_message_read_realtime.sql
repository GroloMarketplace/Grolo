-- Read-state UPDATE events must include the full row for RLS-filtered clients.
alter table public.messages replica identity full;
