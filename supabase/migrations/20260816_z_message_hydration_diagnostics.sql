-- Participant-validated message hydration fallback.
-- This keeps authorization explicit while avoiding a deployed messages RLS
-- policy turning a valid participant thread into an empty result.
create or replace function public.get_conversation_messages(p_conversation_id uuid)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.conversations
    where conversations.id = p_conversation_id
      and (conversations.buyer_id = auth.uid() or conversations.seller_id = auth.uid())
  ) then
    raise exception 'You are not a participant in this conversation.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select messages.id, messages.conversation_id, messages.sender_id,
         messages.content, messages.created_at, messages.read_at
  from public.messages
  where messages.conversation_id = p_conversation_id
  order by messages.created_at asc;
end;
$$;

revoke all on function public.get_conversation_messages(uuid) from public;
grant execute on function public.get_conversation_messages(uuid) to authenticated;

notify pgrst, 'reload schema';
