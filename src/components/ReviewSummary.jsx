import { useNavigate } from "react-router-dom";
import { useReviews } from "../context/ReviewContext";
import OutlineIcon from "./OutlineIcon";

export default function ReviewSummary({ product, onClick }) {
  const navigate = useNavigate();
  const { productRating } = useReviews();
  const { average, count } = productRating(product.id);
  const hasReviews = count > 0;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (onClick) onClick(event);
        else navigate(`/product/${product.id}/reviews`);
      }}
      className="inline-flex items-center gap-1 text-left text-[12px] text-[#498467]"
      aria-label={hasReviews ? `${average} stars, ${count} reviews` : "No reviews yet"}
    >
      <OutlineIcon name="star" size={13} fill={hasReviews ? "currentColor" : "none"} />
      {hasReviews ? `${average.toFixed(1)} (${count} Reviews)` : "No Reviews Yet"}
    </button>
  );
}
