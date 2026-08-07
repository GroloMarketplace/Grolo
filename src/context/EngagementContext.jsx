import { createContext, useCallback, useContext, useMemo, useState } from "react";

const EngagementContext = createContext(null);
const STORAGE_KEY = "grolo-post-engagement";

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

const emptyEngagement = { likes: 0, comments: 0, shares: 0, regrows: 0, liked: false };

function countComments(comments) {
  return comments.reduce((count, comment) => count + 1 + countComments(comment.replies ?? []), 0);
}

export function EngagementProvider({ children }) {
  const [engagement, setEngagement] = useState(readEngagement);

  const getPostEngagement = useCallback((post) => ({
    ...emptyEngagement,
    comments: countComments(post?.commentItems ?? []),
    ...engagement[String(post?.id)] ?? {},
  }), [engagement]);

  const updatePost = useCallback((postId, update) => {
    setEngagement((current) => {
      const next = { ...current, [String(postId)]: { ...emptyEngagement, ...current[String(postId)], ...update } };
      writeEngagement(next);
      return next;
    });
  }, []);

  const togglePostLike = useCallback((postId) => {
    let nextLiked;
    setEngagement((current) => {
      const previous = { ...emptyEngagement, ...current[String(postId)] };
      nextLiked = !previous.liked;
      const next = { ...current, [String(postId)]: { ...previous, liked: nextLiked, likes: Math.max(0, previous.likes + (nextLiked ? 1 : -1)) } };
      writeEngagement(next);
      return next;
    });
    return nextLiked;
  }, []);

  const incrementPostShares = useCallback((postId) => {
    setEngagement((current) => {
      const previous = { ...emptyEngagement, ...current[String(postId)] };
      const next = { ...current, [String(postId)]: { ...previous, shares: previous.shares + 1 } };
      writeEngagement(next);
      return next;
    });
  }, []);

  const togglePostRegrow = useCallback((postId) => {
    let nextRegrown;
    setEngagement((current) => {
      const previous = { ...emptyEngagement, ...current[String(postId)] };
      nextRegrown = !previous.regrown;
      const next = { ...current, [String(postId)]: { ...previous, regrown: nextRegrown, regrows: Math.max(0, previous.regrows + (nextRegrown ? 1 : -1)) } };
      writeEngagement(next);
      return next;
    });
    return nextRegrown;
  }, []);

  const value = useMemo(() => ({ getPostEngagement, updatePost, togglePostLike, incrementPostShares, togglePostRegrow }), [getPostEngagement, updatePost, togglePostLike, incrementPostShares, togglePostRegrow]);
  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  const context = useContext(EngagementContext);
  if (!context) throw new Error("useEngagement must be used within an EngagementProvider");
  return context;
}
