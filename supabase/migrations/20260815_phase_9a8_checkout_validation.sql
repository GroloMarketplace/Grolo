-- Phase 9A.8: server-side checkout validation.

create or replace function public.validate_order_checkout_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  address jsonb := coalesce(new.metadata->'delivery_address', '{}'::jsonb);
begin
  if new.fulfillment_method not in ('pickup', 'delivery') then
    raise exception 'Choose a valid fulfillment method.' using errcode = 'check_violation';
  end if;
  if new.delivery_fee < 0 then
    raise exception 'Delivery fee cannot be negative.' using errcode = 'check_violation';
  end if;
  if new.fulfillment_method = 'delivery' then
    if jsonb_typeof(address) <> 'object'
      or nullif(btrim(address->>'fullName'), '') is null
      or nullif(btrim(address->>'streetAddress'), '') is null
      or nullif(btrim(address->>'city'), '') is null
      or (address->>'province') !~ '^[A-Za-z]{2}$'
      or (address->>'postalCode') !~* '^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$' then
      raise exception 'A complete delivery address is required.' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_order_checkout_fields_trigger on public.orders;
create trigger validate_order_checkout_fields_trigger
before insert on public.orders
for each row execute function public.validate_order_checkout_fields();

notify pgrst, 'reload schema';
