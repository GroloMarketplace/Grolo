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

notify pgrst, 'reload schema';
