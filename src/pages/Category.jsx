import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { readNavigationState, writeNavigationState } from "../hooks/navigationState";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import SearchBar from "../components/SearchBar";
import { categories, sellers } from "../data/mockData";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { useListings } from "../context/ListingContext";
import DistanceLabel from "../components/DistanceLabel";
import PromotionBadge from "../components/PromotionBadge";
import TradeBadge from "../components/TradeBadge";
import { formatListingPrice, listingCategoryLabel } from "../utils/listingDisplay";

function getCategoryName(value) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "Category";
  }
}

export default function Category() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const rememberProduct = (productId) => {
    if (location.state?.fromSearch) {
      writeNavigationState("search", { ...readNavigationState("search", {}), currentProductId: productId });
    }
  };
  const category = getCategoryName(categoryName);
  const { listings } = useListings();
  const scrollRef = useRef(null);
  const savedCategoryState = readNavigationState(`category-${category}`, { query: "", scrollTop: 0 });
  const [query, setQuery] = useState(savedCategoryState.query);
  const queryRef = useRef(query);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedCategoryState.scrollTop;
    const scrollElement = scrollRef.current;
    const saveState = () => writeNavigationState(`category-${category}`, { query: queryRef.current, scrollTop: scrollElement?.scrollTop ?? 0 });
    scrollElement?.addEventListener("scroll", saveState, { passive: true });
    return () => {
      saveState();
      scrollElement?.removeEventListener("scroll", saveState);
    };
  }, [category]);
  const categoryExists = categories.some((item) => item.name === category);
  const categoryProducts = useMemo(
    () => listings.filter((product) => listingCategoryLabel(product).toLowerCase() === category.toLowerCase()),
    [category, listings],
  );
  const filteredProducts = categoryProducts.filter((product) => {
    const searchableText = `${product.name} ${product.shop}`.toLowerCase();
    return searchableText.includes(query.trim().toLowerCase());
  });

  return (
    <MobileScreenLayout>
      <Header title={categoryExists ? category : "Category"} onBack={() => navigate(-1)} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="border-b border-black/5 py-3">
          <SearchBar
            placeholder={`Search within ${category}`}
            value={query}
            onChange={(event) => { queryRef.current = event.target.value; setQuery(event.target.value); }}
          />
        </div>

        <div className="flex flex-col gap-6 px-4 py-4">
          <ProductSection title="Featured Products" products={filteredProducts} onProduct={rememberProduct} />
          <ProductSection title="Trending in Category" products={filteredProducts.slice(0, 4)} onProduct={rememberProduct} />
          <ProductSection title="New Arrivals" products={filteredProducts.slice().reverse().slice(0, 4)} onProduct={rememberProduct} />
          <ProductSection title="Popular Near You" products={filteredProducts.slice(0, 4)} onProduct={rememberProduct} />
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function ProductSection({ title, products: sectionProducts, onProduct }) {
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-semibold tracking-[-0.36px]">{title}</h2>
      {sectionProducts.length === 0 ? (
        <div className="rounded-lg border border-[#E6E6E6] px-4 py-5 text-center text-[14px] text-[#828282]">
          No products found in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sectionProducts.map((product) => (
            <CategoryProductCard key={`${title}-${product.id}`} product={product} onProduct={onProduct} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryProductCard({ product, onProduct }) {
  const navigate = useNavigate();
  if (!product || typeof product !== "object") return null;
  const seller = sellers[product.sellerId];

  return (
    <article className="min-w-0">
      <Link to={`/product/${product.id}`} onClick={() => onProduct?.(product.id)} className="block">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full rounded-lg object-cover"
          />
          {product.promotion && <PromotionBadge promotion={product.promotion} className="absolute left-2 top-2" />}
        </div>
      </Link>
      <div className="flex flex-col gap-1 pt-2">
        <ServiceCategoryLabel listing={product} />
        <button
          type="button"
          onClick={() => navigate(`/seller/${product.sellerId}`)}
          className="truncate text-left text-[12px] text-[#498467]"
        >
          {seller?.name ?? product.shop}
        </button>
        <DistanceLabel content={product} />
        <Link to={`/product/${product.id}`} onClick={() => onProduct?.(product.id)} className="line-clamp-2 text-[14px] font-medium">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-[12px] text-[#828282]">
          <span className="text-[#498467]">★</span>
          <span>{Number.isFinite(Number(product.rating)) && Number(product.rating) > 0 ? Number(product.rating).toFixed(1) : "New"}</span>
          {product.reviewCount && <span>({product.reviewCount})</span>}
        </div>
        <span className="text-[16px] font-semibold">{formatListingPrice(product)}</span>
        <TradeBadge listing={product} compact />
      </div>
    </article>
  );
}
