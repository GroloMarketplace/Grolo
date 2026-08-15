export const seed = {
  buyer: { id: "buyer-1", displayName: "Test Buyer", username: "test_buyer", bio: "Supports local makers.", email: "buyer@example.com", location: "Calgary" },
  seller: { id: "seller-1", name: "Seeded Market", description: "Local goods.", location: "Calgary", email: "seller@example.com", website: "https://example.com", phone: "403-555-0100" },
  listing: { id: "listing-1", title: "Seeded Tomatoes", description: "Fresh tomatoes.", category: "Garden", price: "5.00", quantityAvailable: 10, location: "Calgary" },
  promotion: { id: "promotion-1", title: "Launch discount", type: "percentage", value: 10 },
  address: { fullName: "Test Buyer", streetAddress: "123 Main Street NW", city: "Calgary", province: "AB", postalCode: "T2N 1A1" },
};
