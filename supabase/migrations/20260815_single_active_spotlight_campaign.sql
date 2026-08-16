create or replace function public.validate_single_active_spotlight_campaign()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(coalesce(new.status, '')) in ('active', 'trial')
    and exists (
      select 1
      from public.promotions existing
      where existing.seller_id = new.seller_id
        and existing.id is distinct from new.id
        and lower(coalesce(existing.status, '')) in ('active', 'trial')
        and existing.start_date <= coalesce(new.end_date, 'infinity'::date)
        and coalesce(existing.end_date, 'infinity'::date) >= new.start_date
    ) then
    raise exception 'You already have an active Community Spotlight campaign. Edit or cancel your current campaign before creating a new Spotlight campaign.' using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_single_active_spotlight_campaign_trigger on public.promotions;
create trigger validate_single_active_spotlight_campaign_trigger
before insert or update on public.promotions
for each row execute function public.validate_single_active_spotlight_campaign();

notify pgrst, 'reload schema';
