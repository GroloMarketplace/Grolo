-- Make newly created and updated orders available to seller dashboards in realtime.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'supabase_realtime publication is missing; enable Supabase Realtime before applying this migration.';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
