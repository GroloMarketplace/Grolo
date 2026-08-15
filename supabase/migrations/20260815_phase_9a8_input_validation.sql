-- Phase 9A.8: server-side validation for profile and listing inputs.

alter table public.profiles add column if not exists instagram_handle text;
alter table public.profiles add column if not exists facebook_handle text;
alter table public.profiles add column if not exists x_handle text;
alter table public.profiles add column if not exists seller_website text;
alter table public.profiles add column if not exists seller_phone text;
alter table public.profiles add column if not exists seller_email text;

create or replace function public.validate_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.display_name is not null and char_length(new.display_name) > 80 then
    raise exception 'Display name must be 80 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.username is not null then
    new.username := lower(btrim(new.username));
    if new.username !~ '^[a-z0-9_]{3,30}$' then
      raise exception 'Username must be 3-30 characters using lowercase letters, numbers, or underscores.' using errcode = 'check_violation';
    end if;
  end if;
  if new.bio is not null and char_length(new.bio) > 500 then
    raise exception 'Bio must be 500 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.location is not null and char_length(new.location) > 120 then
    raise exception 'Location must be 120 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.shop_name is not null and char_length(new.shop_name) > 80 then
    raise exception 'Store name must be 80 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.store_description is not null and char_length(new.store_description) > 1000 then
    raise exception 'Store description must be 1000 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.store_location is not null and char_length(new.store_location) > 120 then
    raise exception 'Store location must be 120 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.seller_email is not null and btrim(new.seller_email) <> '' and new.seller_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Enter a valid business email address.' using errcode = 'check_violation';
  end if;
  if new.seller_website is not null and btrim(new.seller_website) <> '' and new.seller_website !~* '^https?://[^\s]+$' then
    raise exception 'Website must start with http:// or https://.' using errcode = 'check_violation';
  end if;
  if new.seller_phone is not null and btrim(new.seller_phone) <> '' and new.seller_phone !~ '^[+0-9() .-]{7,20}$' then
    raise exception 'Enter a valid phone number.' using errcode = 'check_violation';
  end if;
  if coalesce(char_length(new.instagram_handle), 0) > 50
    or coalesce(char_length(new.facebook_handle), 0) > 50
    or coalesce(char_length(new.x_handle), 0) > 50 then
    raise exception 'Social handles must be 50 characters or fewer.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_profile_fields_trigger on public.profiles;
create trigger validate_profile_fields_trigger
before insert or update on public.profiles
for each row execute function public.validate_profile_fields();

create or replace function public.validate_listing_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.title is null or char_length(btrim(new.title)) = 0 or char_length(new.title) > 120 then
    raise exception 'Listing title is required and must be 120 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.description is null or char_length(btrim(new.description)) = 0 or char_length(new.description) > 2000 then
    raise exception 'Description is required and must be 2000 characters or fewer.' using errcode = 'check_violation';
  end if;
  if new.category is distinct from 'Services' and (new.price is null or new.price <= 0) then
    raise exception 'Price must be greater than zero.' using errcode = 'check_violation';
  end if;
  if new.category = 'Services' and (new.pricing_details is null or char_length(btrim(new.pricing_details)) = 0) then
    raise exception 'Pricing details are required for services.' using errcode = 'check_violation';
  end if;
  if new.inventory_quantity < 0 or new.inventory_quantity > 1000000 then
    raise exception 'Quantity must be between 0 and 1000000.' using errcode = 'check_violation';
  end if;
  if new.location is null or char_length(btrim(new.location)) = 0 or char_length(new.location) > 120 then
    raise exception 'A valid listing location is required.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(coalesce(new.image_urls, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(new.image_urls, '[]'::jsonb)) > 5 then
    raise exception 'A listing can contain up to 5 images.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_listing_fields_trigger on public.listings;
create trigger validate_listing_fields_trigger
before insert or update on public.listings
for each row execute function public.validate_listing_fields();

notify pgrst, 'reload schema';
