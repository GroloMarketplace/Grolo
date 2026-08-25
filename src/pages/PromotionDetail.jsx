import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PromotionBadge from "../components/PromotionBadge";
import { promotionDaysRemaining, promotionDisplayLabel, usePromotions } from "../context/PromotionContext";
import { useListings } from "../context/ListingContext";
import { useResolvedSeller } from "../hooks/useEntityResolution";
import { promotionMatchesListing, promotedContentImage } from "../utils/promotionMedia";
import UnavailableAccount from "../components/UnavailableAccount";
import { useBlockedAccount } from "../hooks/useBlockedAccount";

export default function PromotionDetail() {
  const navigate = useNavigate();
  const { promotionId } = useParams();
  const { promotions } = usePromotions();
  const { listings } = useListings();
  const promotion = promotions.find((item) => String(item.id) === String(promotionId));
  const seller = useResolvedSeller(promotion?.sellerId);
  const blocked = useBlockedAccount(promotion?.sellerId);
  const eligibleProducts = promotion
    ? listings.filter((listing) => promotionMatchesListing(promotion, listing))
    : [];
  const heroImage = promotedContentImage({ listing: eligibleProducts[0], promotion });
  const daysRemaining = promotion ? promotionDaysRemaining(promotion) : null;

  if (blocked) return <UnavailableAccount onBack={() => navigate(-1)} />;

  if (!promotion) {
    return (
      <MobileScreenLayout>
        <Header title="Promotion" onBack={() => navigate(-1)} />
        <div className="flex-1 px-4 py-12 text-center">
          <p className="text-[18px] font-semibold">Promotion unavailable</p>
          <p className="mt-2 text-[14px] text-[#828282]">This promotion may have ended or been removed.</p>
        </div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout>
      <Header title="Promotion" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        {heroImage && <img src={heroImage} alt="" className="h-52 w-full rounded-2xl object-cover" />}
        <div className="mt-4 flex items-center gap-2">
          <PromotionBadge promotion={promotion} />
          <span className="text-[12px] text-[#6B756F]">{daysRemaining === null ? "No end date" : daysRemaining <= 0 ? "Ends today" : `${daysRemaining} days remaining`}</span>
        </div>
        <h1 className="mt-3 text-[26px] font-bold tracking-[-0.5px]">{promotion.title}</h1>
        <p className="mt-1 text-[16px] font-semibold text-[#498467]">{promotionDisplayLabel(promotion)}</p>
        {seller?.name && <p className="mt-2 text-[14px] font-medium text-[#6B756F]">{seller.name}</p>}
        {promotion.endsAt && <p className="mt-1 text-[13px] text-[#828282]">Expires {new Date(`${promotion.endsAt}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>}

        <h2 className="mt-7 text-[18px] font-semibold">Eligible Products</h2>
        <div className="mt-3 flex flex-col gap-2">
          {eligibleProducts.length === 0 ? (
            <p className="rounded-lg bg-[#F5F5F5] p-3 text-[13px] text-[#828282]">No eligible products are currently available.</p>
          ) : eligibleProducts.map((listing) => (
            <button key={listing.id} type="button" onClick={() => navigate(`/product/${listing.id}`, { state: { sellerId: listing.sellerId } })} className="flex items-center gap-3 rounded-xl border border-[#E6E6E6] p-3 text-left hover:bg-[#F7FCF8]">
              <img src={promotedContentImage({ listing, promotion })} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{listing.name}</span>
                <span className="mt-0.5 block text-[13px] text-[#498467]">View discounted listing</span>
              </span>
              <span className="text-[#498467]">›</span>
            </button>
          ))}
        </div>
      </div>
    </MobileScreenLayout>
  );
}
