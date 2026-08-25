import { currentUser, sellers } from "../data/mockData";

export function getConversationProfile(conversation, getSellerProfile, buyerProfile, currentUserId) {
  const sellerId = conversation?.sellerId ?? conversation?.storeId;
  const buyerId = conversation?.buyerId;
  const participantId = conversation?.participantId
    ?? (currentUserId && String(currentUserId) === String(buyerId) ? sellerId : currentUserId && String(currentUserId) === String(sellerId) ? buyerId : sellerId);
  const seller = sellerId ? sellers[sellerId] : null;
  const namedSeller = !seller && conversation?.name
    ? Object.values(sellers).find((item) => item.name === conversation.name)
    : null;
  const isCurrentUser = participantId === currentUserId || participantId === currentUser.username || participantId === buyerProfile?.displayName;
  const isSeller = sellerId && String(participantId) === String(sellerId);
  const participant = conversation?.participantProfile;
  const liveSeller = isSeller ? getSellerProfile?.(participantId) : null;
  const profile = isCurrentUser
    ? (buyerProfile ?? currentUser)
    : isSeller
      ? (liveSeller?.name || liveSeller?.avatar ? liveSeller : seller ?? namedSeller ?? {})
      : participant ?? { ...conversation, name: conversation?.participantName ?? conversation?.name, avatar: conversation?.participantAvatar ?? conversation?.avatar };
  return {
    id: participantId ?? profile?.id,
    name: profile?.name ?? profile?.display_name ?? profile?.username ?? conversation?.participantName ?? conversation?.name ?? "User",
    avatar: profile?.avatar ?? profile?.avatar_url ?? conversation?.avatar,
  };
}
