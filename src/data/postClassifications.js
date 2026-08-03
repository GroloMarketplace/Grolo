export const POST_CLASSIFICATIONS = [
  "Garden",
  "Bakery",
  "Crafts",
  "Meal Prep",
  "Produce",
  "Plants",
  "Honey",
  "Beverages",
  "Events",
  "Featured",
  "Trading",
  "Promotion",
];

export function displayPostClassification(classification) {
  return classification === "Event" ? "Events" : classification;
}
