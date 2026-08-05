import { createContext, useContext, useMemo, useState } from "react";
import { communityPosts as initialPosts } from "../data/mockData";

const PostContext = createContext(null);

export function PostProvider({ children }) {
  const [posts, setPosts] = useState(() => initialPosts.map((post, index) => ({
    ...post,
    createdAt: post.createdAt ?? new Date(0).getTime() + (initialPosts.length - index),
  })));

  const addPost = (post) => {
    const createdPost = { ...post, id: post.id ?? `post-${Date.now()}`, createdAt: post.createdAt ?? Date.now() };
    setPosts((current) => [createdPost, ...current]);
    return createdPost;
  };

  const value = useMemo(() => ({ posts, addPost }), [posts]);
  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostContext);
  if (!context) throw new Error("usePosts must be used within a PostProvider");
  return context;
}
