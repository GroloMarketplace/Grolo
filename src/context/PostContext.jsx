import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const PostContext = createContext(null);
const STORAGE_KEY = "grolo-posts";

function readPosts(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistPosts(storageKey, posts) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(posts));
  } catch {
  }
}

export function PostProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "current-user"}`;
  const [posts, setPosts] = useState(() => readPosts(storageKey) ?? []);

  useEffect(() => {
    setPosts(readPosts(storageKey) ?? []);
  }, [storageKey]);

  const addPost = (post) => {
    const createdPost = { ...post, id: post.id ?? `post-${Date.now()}`, createdAt: post.createdAt ?? Date.now() };
    setPosts((current) => {
      const next = [createdPost, ...current];
      persistPosts(storageKey, next);
      return next;
    });
    return createdPost;
  };

  const updatePost = (postId, updates) => {
    setPosts((current) => {
      const next = current.map((post) => post.id === postId ? { ...post, ...updates } : post);
      persistPosts(storageKey, next);
      return next;
    });
  };

  const removePost = (postId) => {
    setPosts((current) => {
      const next = current.filter((post) => post.id !== postId);
      persistPosts(storageKey, next);
      return next;
    });
  };

  const value = useMemo(() => ({ posts, addPost, updatePost, removePost }), [posts]);
  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error("usePosts must be used within a PostProvider");
  return context;
}
