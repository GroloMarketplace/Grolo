import { createContext, useContext, useMemo, useState } from "react";

const FoundingMemberContext = createContext(null);
const STORAGE_KEY = "grolo-founding-members";
const MAX_FOUNDING_MEMBERS = 100;
const INITIAL_FOUNDING_MEMBERS = {
  "sarahs-backyard": {
    registrationNumber: 1,
    reviewSubmitted: true,
    memberSince: "2026-01-15",
    awardedAt: "2026-01-15",
  },
  "current-buyer": {
    registrationNumber: 17,
    reviewSubmitted: true,
    memberSince: "2026-08-07",
    awardedAt: "2026-08-07",
  },
};

function loadMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...INITIAL_FOUNDING_MEMBERS, ...saved } : INITIAL_FOUNDING_MEMBERS;
  } catch {
    return INITIAL_FOUNDING_MEMBERS;
  }
}

function persistMembers(members) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
  }
}

function getExpirationDate(createdAt) {
  const expiration = new Date(`${createdAt}T00:00:00`);
  expiration.setMonth(expiration.getMonth() + 6);
  return expiration;
}

export function FoundingMemberProvider({ children }) {
  const [members, setMembers] = useState(loadMembers);

  const isFoundingMember = (sellerId) => {
    const member = members[sellerId];
    return Boolean(member && member.registrationNumber <= MAX_FOUNDING_MEMBERS && member.reviewSubmitted);
  };

  const getFoundingMember = (sellerId) => {
    if (!isFoundingMember(sellerId)) return null;
    const member = members[sellerId];
    return {
      ...member,
      memberSince: member.createdAt ?? member.memberSince,
      expiresAt: getExpirationDate(member.createdAt ?? member.memberSince ?? member.awardedAt),
    };
  };

  const awardFoundingMember = (sellerId, registrationNumber, reviewSubmitted, createdAt) => {
    if (registrationNumber > MAX_FOUNDING_MEMBERS || !reviewSubmitted || isFoundingMember(sellerId)) return;
    const next = {
      ...members,
      [sellerId]: {
        registrationNumber,
        reviewSubmitted: true,
        ...(createdAt ? { createdAt, memberSince: createdAt } : {}),
        awardedAt: new Date().toISOString().slice(0, 10),
      },
    };
    setMembers(next);
    persistMembers(next);
  };

  const value = useMemo(() => ({ isFoundingMember, getFoundingMember, awardFoundingMember }), [members]);
  return <FoundingMemberContext.Provider value={value}>{children}</FoundingMemberContext.Provider>;
}

export function useFoundingMember() {
  const context = useContext(FoundingMemberContext);
  if (!context) throw new Error("useFoundingMember must be used within a FoundingMemberProvider");
  return context;
}
