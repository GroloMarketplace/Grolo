-- Enforce the launch campaign window for new and resized promotions.
-- Existing campaigns are preserved when their dates are not changed.

create or replace function public.validate_campaign_duration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'UPDATE'
    and old.start_date is not distinct from new.start_date
    and old.end_date is not distinct from new.end_date then
    return new;
  end if;

  if new.start_date is null or new.end_date is null then
    raise exception 'Each promotion must have a start and end date.' using errcode = 'check_violation';
  end if;

  if new.end_date < new.start_date then
    raise exception 'The end date cannot be before the start date.' using errcode = 'check_violation';
  end if;

  if (new.end_date - new.start_date + 1) > 14 then
    raise exception 'Each promotion may run for up to 14 days.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_campaign_duration_trigger on public.promotions;
create trigger validate_campaign_duration_trigger
before insert or update on public.promotions
for each row execute function public.validate_campaign_duration();

notify pgrst, 'reload schema';
