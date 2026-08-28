import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { createPost as createPostApi, getPosts as getPostsApi } from "../lib/api/posts";

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

function addToPosts(storageKey, setPosts, createdPost) {
  setPosts((current) => {
    const next = [createdPost, ...current.filter((post) => post.id !== createdPost.id && post.databaseId !== createdPost.databaseId)];
    persistPosts(storageKey, next);
    return next;
  });
  return createdPost;
}

export function PostProvider({ children }) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY}-${user?.id ?? "current-user"}`;
  const [posts, setPosts] = useState(() => readPosts(storageKey) ?? []);

  useEffect(() => {
    let cancelled = false;
    const cachedPosts = readPosts(storageKey) ?? [];
    setPosts(cachedPosts);

    if (!isSupabaseConfigured || !user?.id) return () => { cancelled = true; };

    getPostsApi()
      .then((remotePosts) => {
        if (cancelled) return;
        const remoteIds = new Set(remotePosts.map((post) => post.id ?? post.databaseId));
        const cachedOnly = cachedPosts.filter((post) => !remoteIds.has(post.id) && !remoteIds.has(post.databaseId));
        setPosts([...remotePosts, ...cachedOnly]);
        persistPosts(storageKey, [...remotePosts, ...cachedOnly]);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [storageKey, user?.id]);

  const addPost = async (post) => {
    const createdPost = isSupabaseConfigured && user?.id
      ? await createPostApi(post, user.id)
      : { ...post, id: post.id ?? `post-${Date.now()}`, createdAt: post.createdAt ?? Date.now() };
    return addToPosts(storageKey, setPosts, createdPost);
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
