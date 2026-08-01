import SellerListingCard from "./SellerListingCard";

export default function EditListingCard({ product, onDelete }) {
  return (
    <SellerListingCard product={product} onDelete={onDelete} />
  );
}
