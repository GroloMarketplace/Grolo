import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { promotionDisplayLabel, usePromotions } from "../context/PromotionContext";
import { sellers } from "../data/mockData";
import { useListings } from "../context/ListingContext";

export default function Promotions() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const { promotionsForSeller } = usePromotions();
  const { listings } = useListings();
  const seller = sellers[sellerId] ?? sellers["sarahs-backyard"];
  const promotions = promotionsForSeller(seller.id);

  return (
    <MobileScreenLayout>
      <Header title="Promotions" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        <p className="text-[14px] text-[#828282]">Active promotions from {seller.name}</p>
        {promotions.length === 0 ? (
          <div className="py-12 text-center text-[14px] text-[#828282]">No active promotions</div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {promotions.map((promotion) => {
              const promotionListings = listings.filter((listing) => promotion.productIds?.includes(listing.id));
              return (
                <article key={promotion.id} className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-4">
                  <div className="text-[12px] font-medium uppercase tracking-[0.3px] text-[#498467]">{promotionDisplayLabel(promotion)}</div>
                  <h2 className="mt-1 text-[17px] font-semibold">{promotion.title}</h2>
                  <div className="mt-3 text-[13px] text-[#828282]">Available on:</div>
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
