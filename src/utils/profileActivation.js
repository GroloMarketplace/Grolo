const SELLER_PROFILE_FIELDS = {
  name: "shop_name",
  description: "store_description",
  avatar: "avatar_url",
  banner: "banner_url",
  vacationMode: "vacation_mode",
  vacationMessage: "vacation_message",
  returnDate: "return_date",
};

export function sellerProfileUpdates(updates) {
  const next = {};
  Object.entries(SELLER_PROFILE_FIELDS).forEach(([key, column]) => {
    const value = updates[key];
    const hasValue = value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "");
    if (hasValue) next[column] = value;
  });
  if (updates.notifications !== undefined) next.seller_notifications = updates.notifications;
  return next;
}

export function hasRepairableStoreProfile(profile) {
  return Boolean(profile?.shop_name?.trim() && profile?.store_opened_at);
}

export function withoutSellerActivationFields(profile) {
  const next = { ...profile };
  delete next.seller_status;
  delete next.store_onboarding_status;
  delete next.store_opened_at;
  return next;
}
