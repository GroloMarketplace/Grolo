import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useListings } from "../context/ListingContext";
import { useResolvedStoreProfile } from "../hooks/useEntityResolution";
import ServiceCategoryLabel from "../components/ServiceCategoryLabel";
import { formatListingPrice, isListingActive, isListingOutOfStock, isServiceListing } from "../utils/listingDisplay";

function decodeCategory(value) {
  try {
    return decodeURIComponent(value ?? "Other");
  } catch {
    return value ?? "Other";
  }
}

export default function StoreCategory() {
  const navigate = useNavigate();
  const { sellerId, categoryName } = useParams();
  const category = decodeCategory(categoryName);
  const { listings } = useListings();
  const storeProfile = useResolvedStoreProfile(sellerId);
  const categoryListings = useMemo(
    () => listings.filter((product) => {
      const productCategory = (product.category?.trim() || "Other").toLowerCase();
      const isService = isServiceListing(product);
      return String(product.sellerId ?? "") === String(sellerId ?? "")
        && (category.toLowerCase() === "out of stock" ? isListingOutOfStock(product) : productCategory === category.toLowerCase() && (isService ? isListingActive(product) : !isListingOutOfStock(product)));
    }),
    [category, listings, sellerId],
  );

  return (
    <MobileScreenLayout>
      <Header title={storeProfile?.name ? `${storeProfile.name} · ${category}` : category} onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[20px] font-semibold">{category}</h1>
          <span className="text-[13px] text-[#828282]">{categoryListings.length} listings</span>
        </div>
        {categoryListings.length === 0 ? (
          <div className="rounded-lg border border-[#E6E6E6] px-4 py-8 text-center text-[14px] text-[#828282]">No listings found in this category.</div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-2 gap-3">
            {categoryListings.map((product) => (
              <button key={product.id} type="button" onClick={() => navigate(`/product/${product.id}`)} className="text-left">
                <div className="relative">
                  <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
                </div>
                <ServiceCategoryLabel listing={product} className="mt-2 block" />
                <span className="mt-1 block text-[14px] font-medium">{product.name}</span>
                <span className="mt-0.5 block text-[16px] font-semibold text-[#498467]">{formatListingPrice(product)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileScreenLayout>
  );
}
