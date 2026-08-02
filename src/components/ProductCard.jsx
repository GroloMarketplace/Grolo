import { Link } from "react-router-dom";
import PromotionBadge from "./PromotionBadge";
import { usePromotions } from "../context/PromotionContext";

export default function ProductCard({ product }) {
  const { promotionsForProduct } = usePromotions();
  const promotion = promotionsForProduct(product.id)[0];

  return (
    <Link
      to={`/product/${product.id}`}
      className="flex flex-col gap-3 w-[148px] shrink-0"
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-[148px] h-[148px] rounded-lg object-cover"
        />
        <PromotionBadge promotion={promotion} className="absolute left-2 top-2" />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-[12px] text-black/50 line-clamp-2">
          {product.shop}
        </div>
        <div className="text-[14px] text-black line-clamp-2">
          {product.name}
        </div>
        <div className="text-[16px] font-medium text-black">
          ${product.price.toFixed(2)}
        </div>
      </div>
    </Link>
  );
}
