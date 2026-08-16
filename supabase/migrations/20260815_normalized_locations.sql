alter table public.profiles add column if not exists neighborhood text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists store_neighborhood text;
alter table public.profiles add column if not exists store_city text;
alter table public.profiles add column if not exists store_province text;
alter table public.profiles add column if not exists store_country text;
alter table public.profiles add column if not exists store_postal_code text;
alter table public.profiles add column if not exists store_latitude double precision;
alter table public.profiles add column if not exists store_longitude double precision;

alter table public.listings add column if not exists neighborhood text;
alter table public.listings add column if not exists city text;
alter table public.listings add column if not exists province text;
alter table public.listings add column if not exists country text;
alter table public.listings add column if not exists postal_code text;
alter table public.listings add column if not exists latitude double precision;
alter table public.listings add column if not exists longitude double precision;

alter table public.events add column if not exists neighborhood text;
alter table public.events add column if not exists city text;
alter table public.events add column if not exists province text;
alter table public.events add column if not exists country text;
alter table public.events add column if not exists postal_code text;
alter table public.events add column if not exists latitude double precision;
alter table public.events add column if not exists longitude double precision;

-- Migrate legacy seller-only location values into the user's primary location.
update public.profiles
set
  location = coalesce(location, store_location),
  neighborhood = coalesce(neighborhood, store_neighborhood),
  city = coalesce(city, store_city),
  province = coalesce(province, store_province),
  country = coalesce(country, store_country),
  postal_code = coalesce(postal_code, store_postal_code),
  latitude = coalesce(latitude, store_latitude),
  longitude = coalesce(longitude, store_longitude)
where store_location is not null
   or store_neighborhood is not null
   or store_city is not null
   or store_province is not null
   or store_country is not null
   or store_postal_code is not null
   or store_latitude is not null
   or store_longitude is not null;

notify pgrst, 'reload schema';
