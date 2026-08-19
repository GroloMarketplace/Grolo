alter table public.reviews add column if not exists review_type text not null default 'product';
alter table public.reviews add column if not exists reviewee_id uuid;
alter table public.reviews add column if not exists order_id uuid;
alter table public.reviews add column if not exists order_item_id uuid;
alter table public.reviews add column if not exists title text;
alter table public.reviews add column if not exists criteria jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists photos jsonb not null default '[]'::jsonb;
alter table public.reviews add column if not exists status text not null default 'published';
alter table public.reviews add column if not exists updated_at timestamptz not null default now();
alter table public.reviews add column if not exists published_at timestamptz;
alter table public.reviews add column if not exists deleted_at timestamptz;
alter table public.reviews alter column listing_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_review_type_check') then
    alter table public.reviews add constraint reviews_review_type_check check (review_type in ('product', 'seller', 'buyer'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_criteria_object_check') then
    alter table public.reviews add constraint reviews_criteria_object_check check (jsonb_typeof(criteria) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_photos_array_check') then
    alter table public.reviews add constraint reviews_photos_array_check check (jsonb_typeof(photos) = 'array');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_status_check') then
    alter table public.reviews add constraint reviews_status_check check (status in ('draft', 'published', 'hidden', 'removed'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_reviewee_id_fkey') then
    alter table public.reviews add constraint reviews_reviewee_id_fkey foreign key (reviewee_id) references public.profiles(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_order_id_fkey') then
    alter table public.reviews add constraint reviews_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass and conname = 'reviews_order_item_id_fkey') then
    alter table public.reviews add constraint reviews_order_item_id_fkey foreign key (order_item_id) references public.order_items(id) on delete cascade;
  end if;
end;
$$;

create index if not exists reviews_listing_idx on public.reviews (listing_id);
create index if not exists reviews_reviewer_idx on public.reviews (reviewer_id);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id);
create index if not exists reviews_order_idx on public.reviews (order_id);
create index if not exists reviews_order_item_idx on public.reviews (order_item_id);
create index if not exists reviews_type_idx on public.reviews (review_type);
create index if not exists reviews_status_idx on public.reviews (status);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create unique index if not exists reviews_buyer_duplicate_idx
  on public.reviews (reviewer_id, order_id, reviewee_id)
  where review_type = 'buyer'
    and reviewer_id is not null
    and order_id is not null
    and reviewee_id is not null;

alter table public.reviews enable row level security;
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone" on public.reviews for select using (status = 'published' and deleted_at is null);
drop policy if exists "Users can update their own review content" on public.reviews;
create policy "Users can update their own review content" on public.reviews for update to authenticated using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);
revoke insert, delete on public.reviews from public;

create or replace function public.create_review(
  p_review_type text,
  p_rating smallint,
  p_order_id uuid,
  p_reviewee_id uuid default null,
  p_listing_id uuid default null,
  p_order_item_id uuid default null,
  p_title text default null,
  p_body text default null,
  p_criteria jsonb default '{}'::jsonb,
  p_photos jsonb default '[]'::jsonb
)
returns public.reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_review public.reviews;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = 'insufficient_privilege';
  end if;
  if p_review_type not in ('product', 'seller', 'buyer') then
    raise exception 'Review type is invalid.' using errcode = 'check_violation';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Review rating must be between 1 and 5.' using errcode = 'check_violation';
  end if;
  if p_order_id is null then
    raise exception 'A completed order is required.' using errcode = 'check_violation';
  end if;
  if p_criteria is null or jsonb_typeof(p_criteria) <> 'object' then
    raise exception 'Review criteria must be a JSON object.' using errcode = 'check_violation';
  end if;
  if p_photos is null or jsonb_typeof(p_photos) <> 'array' then
    raise exception 'Review photos must be a JSON array.' using errcode = 'check_violation';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
    and status = 'Completed'
  for share;
  if not found then
    raise exception 'Reviews require a completed order.' using errcode = 'check_violation';
  end if;

  if p_review_type = 'product' then
    if v_order.buyer_id <> auth.uid()
      or p_listing_id is null
      or p_order_item_id is null
      or p_reviewee_id is not null
      or not exists (
        select 1
        from public.order_items oi
        where oi.id = p_order_item_id
          and oi.order_id = p_order_id
          and oi.listing_id = p_listing_id
          and exists (
            select 1 from public.listings l
            where l.id = p_listing_id
              and l.seller_id = v_order.seller_id
          )
      ) then
      raise exception 'Product reviews require the buyer''s matching purchased listing and order item.'
        using errcode = 'insufficient_privilege';
    end if;
  elsif p_review_type = 'seller' then
    if v_order.buyer_id <> auth.uid()
      or p_reviewee_id is distinct from v_order.seller_id
      or p_listing_id is not null
      or p_order_item_id is not null then
      raise exception 'Seller reviews require the buyer and the seller from the completed order.'
        using errcode = 'insufficient_privilege';
    end if;
  elsif p_review_type = 'buyer' then
    if v_order.seller_id <> auth.uid()
      or p_reviewee_id is distinct from v_order.buyer_id
      or p_listing_id is not null
      or p_order_item_id is not null then
      raise exception 'Buyer reviews require the seller and the buyer from the completed order.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  insert into public.reviews (
    review_type, reviewer_id, reviewee_id, listing_id, order_id, order_item_id,
    rating, title, body, criteria, photos, status, published_at
  ) values (
    p_review_type, auth.uid(), p_reviewee_id, p_listing_id, p_order_id, p_order_item_id,
    p_rating, p_title, p_body, p_criteria, p_photos, 'published', now()
  ) returning * into v_review;

  return v_review;
end;
$$;

revoke execute on function public.create_review(text, smallint, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb) from public;
grant execute on function public.create_review(text, smallint, uuid, uuid, uuid, uuid, text, text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
