import { createContext, useContext, useState } from "react";

const FollowContext = createContext();

export function FollowProvider({ children }) {
  const [followedSellers, setFollowedSellers] = useState([]);

  const followSeller = (sellerId) => {
    if (!followedSellers.includes(sellerId)) {
      setFollowedSellers([...followedSellers, sellerId]);
    }
  };

  const unfollowSeller = (sellerId) => {
    setFollowedSellers(followedSellers.filter((id) => id !== sellerId));
  };

  const toggleFollow = (sellerId) => {
    if (followedSellers.includes(sellerId)) {
      unfollowSeller(sellerId);
    } else {
      followSeller(sellerId);
    }
  };

  const isFollowing = (sellerId) => {
    return followedSellers.includes(sellerId);
  };

  return (
    <FollowContext.Provider
      value={{
        followedSellers,
        followSeller,
        unfollowSeller,
        toggleFollow,
        isFollowing,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollow must be used within a FollowProvider");
  }
  return context;
}
