import { createContext, useCallback, useContext, useMemo, useState } from "react";

const EngagementContext = createContext(null);
const STORAGE_KEY = "grolo-post-engagement";
const emptyEngagement = { likes: 0, comments: 0, shares: 0, regrows: 0, liked: false, regrown: false };

function readEngagement() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeEngagement(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function countComments(comments) {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);
}

function keyFor(type, id) {
  return `${type}:${String(id)}`;
}

export function EngagementProvider({ children }) {
  const [engagement, setEngagement] = useState(readEngagement);

  const getEngagement = useCallback((type, item) => ({
    ...emptyEngagement,
    comments: countComments(item?.commentItems ?? []),
    ...engagement[keyFor(type, item?.id)] ?? {},
  }), [engagement]);

  const getPostEngagement = useCallback((post) => getEngagement("post", post), [getEngagement]);

  const updateEngagement = useCallback((type, id, update) => {
    setEngagement((current) => {
      const key = keyFor(type, id);
      const next = { ...current, [key]: { ...emptyEngagement, ...current[key], ...update } };
      writeEngagement(next);
      return next;
    });
  }, []);

  const updatePost = useCallback((id, update) => updateEngagement("post", id, update), [updateEngagement]);

  const toggleLike = useCallback((type, id) => {
    let nextLiked;
    setEngagement((current) => {
      const key = keyFor(type, id);
      const previous = { ...emptyEngagement, ...current[key] };
      nextLiked = !previous.liked;
      const next = { ...current, [key]: { ...previous, liked: nextLiked, likes: Math.max(0, previous.likes + (nextLiked ? 1 : -1)) } };
      writeEngagement(next);
      return next;
    });
    return nextLiked;
  }, []);

  const togglePostLike = useCallback((id) => toggleLike("post", id), [toggleLike]);

  const incrementShares = useCallback((type, id) => {
    setEngagement((current) => {
      const key = keyFor(type, id);
      const previous = { ...emptyEngagement, ...current[key] };
      const next = { ...current, [key]: { ...previous, shares: previous.shares + 1 } };
      writeEngagement(next);
      return next;
    });
  }, []);

  const incrementPostShares = useCallback((id) => incrementShares("post", id), [incrementShares]);

  const toggleRegrow = useCallback((type, id) => {
    let nextRegrown;
    setEngagement((current) => {
      const key = keyFor(type, id);
      const previous = { ...emptyEngagement, ...current[key] };
      nextRegrown = !previous.regrown;
      const next = { ...current, [key]: { ...previous, regrown: nextRegrown, regrows: Math.max(0, previous.regrows + (nextRegrown ? 1 : -1)) } };
      writeEngagement(next);
      return next;
    });
    return nextRegrown;
  }, []);

  const togglePostRegrow = useCallback((id) => toggleRegrow("post", id), [toggleRegrow]);

  const value = useMemo(() => ({ getEngagement, getPostEngagement, updateEngagement, updatePost, toggleLike, togglePostLike, incrementShares, incrementPostShares, toggleRegrow, togglePostRegrow }), [getEngagement, getPostEngagement, updateEngagement, updatePost, toggleLike, togglePostLike, incrementShares, incrementPostShares, toggleRegrow, togglePostRegrow]);
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  const context = useContext(EngagementContext);
  if (!context) throw new Error("useEngagement must be used within an EngagementProvider");
  return context;
}
