export const BUYER_TRUST_LEVELS = [
  {
    name: "Building Trust",
    icon: "sprout",
    description: "New members beginning their marketplace journey.",
    benefits: "Start building a reliable transaction history and earn seller confidence.",
    requirements: [],
  },
  {
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
  {
    name: "Community Trusted",
    icon: "trophy",
    description: "One of the most trusted buyers on Grolo.",
    benefits: "Be recognized as a long-term, dependable member of the Grolo marketplace.",
    requirements: [
      { key: "completedTransactions", label: "Complete 75 transactions", target: 75 },
      { key: "sellerRecommendations", label: "Be Seller Recommended by 20 sellers", target: 20 },
      { key: "wouldTransactAgain", label: "Receive 40 would-transact-again ratings", target: 40 },
      { key: "eventsAttended", label: "Attend 10 community events", target: 10 },
      { key: "accountAgeMonths", label: "Keep your account active for 6 months", target: 6 }
    ],
  },
  {
    name: "Grolo Ambassador",
    icon: "diamond",
    description: "The highest level of trust and commitment within the Grolo community.",
    benefits: "Represent the highest standard of reliability, participation, and positive marketplace experience on Grolo.",
    requirements: [
      { key: "completedTransactions", label: "Complete 150 transactions", target: 150 },
      { key: "sellerRecommendations", label: "Be Seller Recommended by 50 sellers", target: 50 },
      { key: "wouldTransactAgain", label: "Receive 75 would-transact-again ratings", target: 75 },
      { key: "eventsAttended", label: "Attend 20 community events", target: 20 },
      { key: "accountAgeMonths", label: "Keep your account active for 1 year", target: 12 }
    ],
  },
];

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
