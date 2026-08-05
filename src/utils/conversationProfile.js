import { currentUser, sellers } from "../data/mockData";

export function getConversationProfile(conversation, getSellerProfile, buyerProfile) {
  const participantId = conversation?.participantId ?? conversation?.storeId ?? conversation?.sellerId;
  const seller = participantId ? sellers[participantId] : null;
  const namedSeller = !seller && conversation?.name
    ? Object.values(sellers).find((item) => item.name === conversation.name)
    : null;
  const isCurrentUser = participantId === currentUser.username || participantId === buyerProfile?.displayName;
  const profile = isCurrentUser
    ? (buyerProfile ?? currentUser)
    : (seller || namedSeller ? getSellerProfile?.(participantId) : null) ?? seller ?? namedSeller;
  return {
    id: participantId ?? profile?.id,
    name: profile?.name ?? conversation?.name ?? "User",
    avatar: profile?.avatar ?? conversation?.avatar,
  };
}
