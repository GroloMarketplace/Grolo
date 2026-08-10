import { createContext, useContext, useMemo, useState } from "react";

const PostContext = createContext(null);

export function PostProvider({ children }) {
  const [posts, setPosts] = useState([]);

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
