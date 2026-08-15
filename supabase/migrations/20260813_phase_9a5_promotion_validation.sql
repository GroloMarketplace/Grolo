-- Phase 9A.5: server-side promotion validation.
-- Only percentage and fixed_amount promotions are pricing-supported.

alter table public.promotions alter column promotion_type set default 'percentage';
alter table public.promotions alter column discount_type set default 'percentage';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.promotions'::regclass
      and conname = 'promotions_promotion_type_check'
  ) then
    alter table public.promotions add constraint promotions_promotion_type_check
      check (promotion_type in ('percentage', 'fixed_amount'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.promotions'::regclass
      and conname = 'promotions_discount_type_check'
  ) then
    alter table public.promotions add constraint promotions_discount_type_check
      check (discount_type in ('percentage', 'fixed_amount'));
  end if;
end;
$$;

create or replace function public.validate_promotion_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  selected_count integer;
  matching_count integer;
  minimum_listing_price numeric;
begin
  if auth.uid() is null or new.seller_id <> auth.uid() then
    raise exception 'Only the seller can create or update this promotion.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and suspended_at is not null) then
    raise exception 'Suspended accounts cannot create or update promotions.' using errcode = 'insufficient_privilege';
  end if;

  if new.title is null or length(btrim(new.title)) = 0 then
    raise exception 'Promotion name is required.' using errcode = 'check_violation';
  end if;

  if new.promotion_type not in ('percentage', 'fixed_amount')
    or new.discount_type not in ('percentage', 'fixed_amount')
    or new.promotion_type <> new.discount_type then
    raise exception 'Promotion type must be percentage or fixed_amount.' using errcode = 'check_violation';
  end if;

  if new.listing_ids is null
    or jsonb_typeof(new.listing_ids) <> 'array'
    or jsonb_array_length(new.listing_ids) = 0 then
    raise exception 'Select at least one active listing.' using errcode = 'check_violation';
  end if;

  select count(distinct value) into selected_count
  from jsonb_array_elements_text(new.listing_ids);

  select count(*) into matching_count
  from jsonb_array_elements_text(new.listing_ids) selected(value)
  where exists (
    select 1
    from public.listings listing
    where listing.seller_id = new.seller_id
      and listing.status = 'Active'
      and (listing.id::text = selected.value or listing.legacy_id = selected.value)
  );

  if selected_count <> matching_count then
    raise exception 'Every selected listing must belong to you and be active.' using errcode = 'check_violation';
  end if;

  if new.listing_id is not null and not exists (
    select 1
    from jsonb_array_elements_text(new.listing_ids) selected(value)
    where selected.value = new.listing_id
  ) then
    raise exception 'The primary listing must be one of the selected listings.' using errcode = 'check_violation';
  end if;

  if new.start_date is null then
    raise exception 'Promotion start date is required.' using errcode = 'check_violation';
  end if;
  if new.end_date is not null and new.end_date < new.start_date then
    raise exception 'Promotion end date cannot be before the start date.' using errcode = 'check_violation';
  end if;
  if new.end_date is not null and new.end_date < current_date then
    raise exception 'Promotion end date cannot be in the past.' using errcode = 'check_violation';
  end if;

  if new.discount_value is null or new.discount_value <= 0 then
    raise exception 'Discount must be greater than zero.' using errcode = 'check_violation';
  end if;

  if new.promotion_type = 'percentage' and new.discount_value > 100 then
    raise exception 'Percentage discount cannot be greater than 100%.' using errcode = 'check_violation';
  end if;

  if new.promotion_type = 'fixed_amount' then
    select min(listing.price) into minimum_listing_price
    from jsonb_array_elements_text(new.listing_ids) selected(value)
    join public.listings listing
      on listing.seller_id = new.seller_id
     and listing.status = 'Active'
     and (listing.id::text = selected.value or listing.legacy_id = selected.value)
    where listing.price > 0;

    if minimum_listing_price is not null and new.discount_value >= minimum_listing_price then
      raise exception 'Fixed discount must be less than the selected listing price.' using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_promotion_fields_trigger on public.promotions;
create trigger validate_promotion_fields_trigger
before insert or update on public.promotions
for each row execute function public.validate_promotion_fields();

notify pgrst, 'reload schema';
