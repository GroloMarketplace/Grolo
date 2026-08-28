import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { awardBadge, getFoundingMember as getSupabaseFoundingMember } from "../lib/api/reputation";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const FoundingMemberContext = createContext(null);
const STORAGE_KEY = "grolo-founding-members";
const MAX_FOUNDING_MEMBERS = 100;
const FOUNDING_MEMBER_YEAR = 2026;
const INITIAL_FOUNDING_MEMBERS = {};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMember(member) {
  if (!member) return null;
  const memberSince = member.memberSince ?? member.member_since ?? member.awardedAt ?? member.awarded_at ?? today();
  return {
    ...member,
    registrationNumber: member.registrationNumber ?? member.registration_number,
    awardedAt: member.awardedAt ?? member.awarded_at,
    memberSince,
    reviewSubmitted: member.reviewSubmitted ?? member.review_submitted ?? true,
    reserved: member.reserved ?? false,
    expiresAt: getExpirationDate(memberSince),
  };
}

function loadMembers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const members = saved ? { ...INITIAL_FOUNDING_MEMBERS, ...saved } : INITIAL_FOUNDING_MEMBERS;
    return Object.fromEntries(Object.entries(members).map(([sellerId, member]) => [sellerId, normalizeMember(member)]));
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

function getExpirationDate() {
  return null;
}

function isFoundingYearStore(storeCreatedAt) {
  const createdAt = storeCreatedAt ? new Date(storeCreatedAt) : null;
  return Boolean(createdAt && !Number.isNaN(createdAt.getTime()) && createdAt.getUTCFullYear() === FOUNDING_MEMBER_YEAR);
}

export function FoundingMemberProvider({ children }) {
  const [members, setMembers] = useState(loadMembers);
  const supabaseRequests = useRef(new Set());

  const requestSupabaseMember = useCallback((sellerId) => {
    if (!sellerId || supabaseRequests.current.has(sellerId)) return;
    if (!isSupabaseConfigured) {
      supabaseRequests.current.add(sellerId);
      return;
    }
    supabaseRequests.current.add(sellerId);
    getSupabaseFoundingMember(sellerId)
      .then((member) => {
        if (member) {
          const normalized = normalizeMember(member);
          setMembers((current) => {
            const next = { ...current, [sellerId]: normalized };
            persistMembers(next);
            return next;
          });
        } else {
        }
      })
      .catch((error) => {
      });
  }, []);

  const getFoundingMember = useCallback((sellerId, storeCreatedAt) => {
    requestSupabaseMember(sellerId);
    const member = normalizeMember(members[sellerId]);
    if (member && Number.isInteger(Number(member.registrationNumber)) && Number(member.registrationNumber) >= 1 && Number(member.registrationNumber) <= MAX_FOUNDING_MEMBERS) return member;
    if (isFoundingYearStore(storeCreatedAt)) {
      return {
        memberSince: storeCreatedAt,
        awardedAt: storeCreatedAt,
        registrationNumber: null,
        reviewSubmitted: true,
        reserved: false,
        qualifiedByLaunchEra: true,
        expiresAt: getExpirationDate(accountCreatedAt),
      };
    }
    return null;
  }, [members, requestSupabaseMember]);

  const isFoundingMember = useCallback((sellerId, storeCreatedAt) => Boolean(getFoundingMember(sellerId, storeCreatedAt)), [getFoundingMember]);


  const awardFoundingMember = useCallback((sellerId, createdAt = today()) => {
    const existing = members[sellerId];
    if (existing) return existing;
    if (!isFoundingYearStore(createdAt)) return null;
    const usedNumbers = Object.values(members).map((member) => member.registrationNumber).filter(Boolean);
    const registrationNumber = Array.from({ length: MAX_FOUNDING_MEMBERS }, (_, index) => index + 1).find((number) => !usedNumbers.includes(number));
    if (!registrationNumber) return null;
    const nextMember = { registrationNumber, memberSince: createdAt, awardedAt: createdAt, reviewSubmitted: true, reserved: false };
    const next = { ...members, [sellerId]: nextMember };
    setMembers(next);
    persistMembers(next);

    if (isSupabaseConfigured) {
      awardBadge({
        userId: sellerId,
        badgeCode: "founding_member",
        metadata: {
          registrationNumber,
          awardedAt: createdAt,
          memberSince: createdAt,
          reviewSubmitted: true,
          reserved: false,
        },
        awardedAt: createdAt,
      })
        .then((badge) => {
          const remoteMember = normalizeMember(badge?.metadata ? { ...badge.metadata, awardedAt: badge.awardedAt } : nextMember);
          setMembers((current) => {
            const updated = { ...current, [sellerId]: remoteMember };
            persistMembers(updated);
            return updated;
          });
        })
        .catch((error) => {});
    }
    return nextMember;
  }, [members]);

  const value = useMemo(() => ({ isFoundingMember, getFoundingMember, awardFoundingMember }), [isFoundingMember, getFoundingMember, awardFoundingMember]);
  return <FoundingMemberContext.Provider value={value}>{children}</FoundingMemberContext.Provider>;
}

export function useFoundingMember() {
  const context = useContext(FoundingMemberContext);
  if (!context) throw new Error("useFoundingMember must be used within a FoundingMemberProvider");
  return context;
}
