import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { promotionUrgencyLabel, usePromotions } from "../context/PromotionContext";
import { sellers } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import { useProfileMode } from "../context/ProfileModeContext";
import DistanceLabel from "../components/DistanceLabel";
import PromotionBadge from "../components/PromotionBadge";

export default function Promotions() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const { promotionsForSeller } = usePromotions();
  const { listings } = useListings();
  const { storeOpenedAt } = useProfileMode();
  const seller = sellers[sellerId] ?? { id: sellerId ?? "current-user", name: "your store" };
  const promotions = promotionsForSeller(seller.id).filter((promotion) => Number(promotion.createdAt) >= storeOpenedAt);

  return (
    <MobileScreenLayout>
      <Header title="Promotions" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        <p className="text-[14px] text-[#828282]">Active promotions from {seller.name}</p>
        {promotions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[18px] font-semibold">No promotions yet.</p>
            <p className="mt-2 text-[14px] text-[#828282]">Create your first promotion to bring attention to your listings.</p>
            <button type="button" onClick={() => navigate("/create-promotion")} className="mt-4 rounded-lg bg-[#498467] px-4 py-2.5 text-[13px] font-medium text-white">+ Create Promotion</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {promotions.map((promotion) => {
              const promotionListings = listings.filter((listing) => promotion.productIds?.includes(listing.id));
              return (
                <article key={promotion.id} className="rounded-xl border border-[#F3D38A] bg-gradient-to-br from-[#FFFDF5] to-[#F5FFF6] p-5 shadow-[0_5px_18px_rgba(73,132,103,0.14)]">
                  <div className="flex items-center justify-between gap-3"><PromotionBadge promotion={promotion} /><span className="text-[12px] font-medium text-[#6B756F]">{promotionUrgencyLabel(promotion)}</span></div>
                  <h2 className="mt-4 text-[21px] font-bold">{promotion.title}</h2>
                  <p className="mt-2 text-[14px] font-semibold text-[#498467]">{seller.name}</p>
                  <DistanceLabel content={seller} className="mt-1 block" />
                  <div className="mt-4 text-[13px] font-medium text-[#828282]">Available on:</div>
                  <div className="mt-1 flex flex-col gap-1 text-[14px] text-[#4F4F4F]">
                    {promotionListings.length > 0 ? promotionListings.map((listing) => <div key={listing.id}>{listing.name}</div>) : <div>No current listings</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MobileScreenLayout>
  );
}
