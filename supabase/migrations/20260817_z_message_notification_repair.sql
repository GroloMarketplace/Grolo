-- Repair message notification generation for deployments where the original
-- message trigger was not applied or referenced an older notification schema.
alter table public.notifications add column if not exists actor_id uuid;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar text;
alter table public.notifications add column if not exists subject_title text;
alter table public.notifications add column if not exists subject_image_url text;
alter table public.notifications add column if not exists store_image_url text;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  listing_id text;
  listing_title text;
  listing_image text;
  store_avatar text;
  sender_name text;
  sender_avatar text;
  notification_id uuid;
begin
  select
    case when c.buyer_id = new.sender_id then c.seller_id else c.buyer_id end,
    c.listing_id::text,
    coalesce(l.title, l.name),
    l.image_urls->>0,
    seller_profile.avatar_url,
    coalesce(sender_profile.display_name, sender_profile.username, sender_profile.shop_name, sender_user.raw_user_meta_data ->> 'display_name', sender_user.raw_user_meta_data ->> 'full_name'),
    sender_profile.avatar_url
  into recipient, listing_id, listing_title, listing_image, store_avatar, sender_name, sender_avatar
  from public.conversations c
  left join public.listings l on l.id = c.listing_id
  left join public.profiles seller_profile on seller_profile.id = c.seller_id
  left join public.profiles sender_profile on sender_profile.id = new.sender_id
  left join auth.users sender_user on sender_user.id = new.sender_id
  where c.id = new.conversation_id;

  raise log 'message notification attempt: notification_type=%, recipient_id=%, actor_id=%, conversation_id=%, listing_id=%',
    'new_message', recipient, new.sender_id, new.conversation_id, listing_id;

  if recipient is null or recipient = new.sender_id then
    raise warning 'message notification skipped: notification_type=%, recipient_id=%, actor_id=%, conversation_id=%, listing_id=%',
      'new_message', recipient, new.sender_id, new.conversation_id, listing_id;
    return new;
  end if;

  begin
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      actor_id,
      actor_name,
      actor_avatar,
      subject_title,
      subject_image_url,
      store_image_url
    ) values (
      recipient,
      'new_message',
      'New message',
      case when listing_title is not null then 'Regarding: ' || listing_title else coalesce(sender_name, 'Someone') || ' sent you a message.' end,
      new.conversation_id::text,
      new.sender_id,
      sender_name,
      sender_avatar,
      listing_title,
      listing_image,
      store_avatar
    )
    returning id into notification_id;

    raise log 'message notification inserted: notification_type=%, notification_id=%, recipient_id=%, actor_id=%, conversation_id=%, listing_id=%',
      'new_message', notification_id, recipient, new.sender_id, new.conversation_id, listing_id;
  exception when others then
    raise warning 'message notification insertion failed: notification_type=%, recipient_id=%, actor_id=%, conversation_id=%, listing_id=%, sqlstate=%, error=%',
      'new_message', recipient, new.sender_id, new.conversation_id, listing_id, SQLSTATE, SQLERRM;
  end;

  return new;
end;
$$;

drop trigger if exists notifications_on_message on public.messages;
create trigger notifications_on_message
after insert on public.messages
for each row execute function public.notify_new_message();

notify pgrst, 'reload schema';
