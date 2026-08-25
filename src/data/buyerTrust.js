export const BUYER_TRUST_LEVELS = [
  {
    code: "new_buyer",
    name: "New Buyer",
    icon: "sprout",
    description: "New members beginning their marketplace journey.",
    benefits: "Start building a reliable transaction history and earn seller confidence.",
    requirements: [],
  },
  {
    code: "trusted_buyer",
    name: "Trusted Buyer",
    icon: "leaf",
    description: "Consistently completing successful purchases and receiving positive seller experiences.",
    benefits: "Show sellers that you are a dependable buyer who follows through.",
    requirements: [
      { key: "completedTransactions", label: "Complete 5 transactions", target: 5 },
      { key: "sellerRecommendations", label: "Be Seller Recommended by 2 sellers", target: 2 },
      { key: "wouldTransactAgain", label: "Receive 3 would-transact-again ratings", target: 3 },
    ],
  },
  {
    code: "established_buyer",
    name: "Established Buyer",
    icon: "tree",
    description: "A highly engaged community member with a strong transaction history.",
    benefits: "Build a visible record of positive marketplace participation and repeat trust.",
    requirements: [
      { key: "completedTransactions", label: "Complete 15 transactions", target: 15 },
      { key: "sellerRecommendations", label: "Be Seller Recommended by 5 sellers", target: 5 },
      { key: "wouldTransactAgain", label: "Receive 10 would-transact-again ratings", target: 10 },
      { key: "accountAgeDays", label: "Keep your account active for 60 days", target: 60 },
    ],
  },
  {
    code: "community_champion",
    name: "Community Champion",
    icon: "star",
    description: "An active buyer who supports local businesses and participates in the community.",
    benefits: "Be recognized for combining reliable marketplace activity with meaningful community participation.",
    requirements: [
      { key: "completedTransactions", label: "Complete 35 transactions", target: 35 },
      { key: "sellerRecommendations", label: "Be Seller Recommended by 10 sellers", target: 10 },
      { key: "wouldTransactAgain", label: "Receive 20 would-transact-again ratings", target: 20 },
      { key: "eventsAttended", label: "Attend 5 community events", target: 5 },
    ],
  },
];

export const BUYER_STATUS_BY_CODE = Object.freeze(Object.fromEntries(BUYER_TRUST_LEVELS.map((level) => [level.code, level])));

export function normalizeBuyerStatusCode(code) {
  if (BUYER_STATUS_BY_CODE[code]) return code;
  if (["community_trusted", "grolo_ambassador"].includes(code)) return "community_champion";
  return "new_buyer";
}

export function getBuyerStatusPresentation(code) {
  return BUYER_STATUS_BY_CODE[normalizeBuyerStatusCode(code)];
}

export function getBuyerTrustLevel(trust = {}) {
  let currentIndex = 0;
  for (let index = 1; index < BUYER_TRUST_LEVELS.length; index += 1) {
    const requirements = BUYER_TRUST_LEVELS[index].requirements;
    if (requirements.every((requirement) => trust[requirement.key] >= requirement.target)) currentIndex = index;
  }

  const current = BUYER_TRUST_LEVELS[currentIndex];
  const next = BUYER_TRUST_LEVELS[currentIndex + 1] ?? null;
  const nextRequirements = next?.requirements ?? [];
  const progress = nextRequirements.length === 0
    ? 100
    : Math.round(nextRequirements.reduce((total, requirement) => (
      total + Math.min((trust[requirement.key] ?? 0) / requirement.target, 1)
    ), 0) / nextRequirements.length * 100);

  return { current, currentIndex, next, nextRequirements, progress };
}
