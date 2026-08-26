insert into public.trade_proposals (
  id,
  buyer_id,
  seller_id,
  conversation_id,
  requested_listing,
  offered_listings,
  message,
  photos,
  status
)
select
  proposal->>'id',
  conversations.buyer_id,
  conversations.seller_id,
  conversations.id,
  coalesce(proposal->'requestedListing', '{}'::jsonb),
  coalesce(proposal->'offeredListings',
    case
      when proposal ? 'offeredListing' then jsonb_build_array(proposal->'offeredListing')
      else '[]'::jsonb
    end
  ),
  coalesce(proposal->>'message', ''),
  coalesce(proposal->'photos', '[]'::jsonb),
  case conversations.metadata->>'tradeStatus'
    when 'accepted' then 'accepted'
    when 'declined' then 'declined'
    when 'countered' then 'countered'
    else coalesce(proposal->>'status', 'pending')
  end
from public.conversations
cross join lateral (values (conversations.metadata->'tradeProposal')) as proposal_data(proposal)
where jsonb_typeof(proposal_data.proposal) = 'object'
  and nullif(proposal_data.proposal->>'id', '') is not null
on conflict (id) do nothing;

update public.conversations
set metadata = metadata - 'tradeProposal' - 'tradeStatus'
where metadata ? 'tradeProposal' or metadata ? 'tradeStatus';
