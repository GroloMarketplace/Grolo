import { createContext, useContext, useMemo, useState } from "react";

const FoundingMemberContext = createContext(null);
const STORAGE_KEY = "grolo-founding-members";
const MAX_FOUNDING_MEMBERS = 100;
const INITIAL_FOUNDING_MEMBERS = {};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const members = saved ? { ...INITIAL_FOUNDING_MEMBERS, ...saved } : INITIAL_FOUNDING_MEMBERS;
    return Object.fromEntries(Object.entries(members).map(([sellerId, member]) => [sellerId, { ...member, reviewSubmitted: true, reserved: false }]));
  } catch {
    return INITIAL_FOUNDING_MEMBERS;
  }
}

function persistMembers(members) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  } catch {
    // Persistence is best effort; the in-memory state remains available.
  }
}

function getExpirationDate(createdAt) {
  const expiration = new Date(`${createdAt}T00:00:00`);
  expiration.setMonth(expiration.getMonth() + 6);
  return expiration;
}

export function FoundingMemberProvider({ children }) {
  const [members, setMembers] = useState(loadMembers);

  const getFoundingMember = (sellerId) => {
    const member = members[sellerId];
    if (!member || member.registrationNumber > MAX_FOUNDING_MEMBERS) return null;
    const memberSince = member.memberSince ?? member.awardedAt ?? today();
    return { ...member, reviewSubmitted: true, reserved: false, memberSince, expiresAt: getExpirationDate(memberSince) };
  };

  const isFoundingMember = (sellerId) => Boolean(getFoundingMember(sellerId));

  const awardFoundingMember = (sellerId, createdAt = today()) => {
    if (members[sellerId]) return members[sellerId];
    const usedNumbers = Object.values(members).map((member) => member.registrationNumber).filter(Boolean);
    const registrationNumber = Array.from({ length: MAX_FOUNDING_MEMBERS }, (_, index) => index + 1).find((number) => !usedNumbers.includes(number));
    if (!registrationNumber) return null;
    const nextMember = { registrationNumber, memberSince: createdAt, awardedAt: createdAt, reviewSubmitted: true, reserved: false };
    const next = { ...members, [sellerId]: nextMember };
    setMembers(next);
    persistMembers(next);
    return nextMember;
  };

  const value = useMemo(() => ({ isFoundingMember, getFoundingMember, awardFoundingMember }), [members]);
  return <FoundingMemberContext.Provider value={value}>{children}</FoundingMemberContext.Provider>;
}

export function useFoundingMember() {
  const context = useContext(FoundingMemberContext);
  if (!context) throw new Error("useFoundingMember must be used within a FoundingMemberProvider");
  return context;
}
