// Marketplace content is created by users or loaded from the backend. New accounts
// must never receive records from this module.
export const products = [];
export const promotions = [];
export const sellers = {};
export const categories = [
  { name: "Garden" },
  { name: "Bakery" },
  { name: "Crafts" },
  { name: "Meal Prep" },
  { name: "Services" },
];
export const reviews = [];
export const mapLocations = [];
export const eventTypes = ["Farmers Market", "Pop-Up", "Workshop", "Pickup Day", "Sale", "Tasting", "Other"];
export const events = [];
export const currentUser = {
  id: "current-user",
  username: "you",
  avatar: "",
};
export const orderStatuses = [];
export const orders = [];
export const productReviews = [];
export const followingPosts = [];
export const communityPosts = [];
export const notificationsActivity = [];
export const notificationsHighlights = [];
export const notificationsFollowers = [];
export const messages = [];
export const chatMessages = [];
export const cartItems = [];
export const shoppers = [];
export const analyticsData = Object.fromEntries(
  ["7days", "30days", "90days", "allTime"].map((period) => [period, {
    totalViews: 0,
    totalFavorites: 0,
    totalMessages: 0,
    totalFollowers: 0,
    totalListings: 0,
    totalSales: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    viewsOverTime: [0],
    favoritesOverTime: [0],
    messagesOverTime: [0],
    labels: ["Now"],
  }]),
);
export const chartXAxis = [];
export const featuredCommunitySpotlights = [];
