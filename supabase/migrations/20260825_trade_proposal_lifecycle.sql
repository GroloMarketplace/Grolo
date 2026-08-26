alter table public.conversations
  add column if not exists trade_proposal_id text references public.trade_proposals(id) on delete set null;

alter table public.trade_proposals
  add column if not exists counter_offer jsonb;

create table if not exists public.trade_proposal_events (
  id uuid primary key default gen_random_uuid(),
  trade_proposal_id text not null references public.trade_proposals(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  counter_offer jsonb,
  created_at timestamptz not null default now()
);

alter table public.trade_proposal_events enable row level security;

drop policy if exists "Trade participants can view proposal events" on public.trade_proposal_events;
create policy "Trade participants can view proposal events"
  on public.trade_proposal_events for select to authenticated
  using (exists (
    select 1 from public.trade_proposals
    where trade_proposals.id = trade_proposal_events.trade_proposal_id
      and (auth.uid() = trade_proposals.buyer_id or auth.uid() = trade_proposals.seller_id)
  ));

drop policy if exists "Trade participants can create proposal events" on public.trade_proposal_events;
create policy "Trade participants can create proposal events"
  on public.trade_proposal_events for insert to authenticated
  with check (auth.uid() = actor_id and exists (
    select 1 from public.trade_proposals
    where trade_proposals.id = trade_proposal_events.trade_proposal_id
      and (auth.uid() = trade_proposals.buyer_id or auth.uid() = trade_proposals.seller_id)
  ));

insert into public.trade_proposal_events (trade_proposal_id, actor_id, status, counter_offer, created_at)
select id, coalesce(accepted_by, seller_id), status, counter_offer, coalesce(accepted_at, created_at)
from public.trade_proposals
where not exists (
  select 1 from public.trade_proposal_events events
  where events.trade_proposal_id = trade_proposals.id
);

update public.conversations
set trade_proposal_id = trade_proposals.id
from public.trade_proposals
where trade_proposals.conversation_id = conversations.id
  and conversations.trade_proposal_id is null;
