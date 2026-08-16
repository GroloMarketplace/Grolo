import { MoreVertical, Pencil, StopCircle, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { promotionDaysRemaining, promotionDisplayLabel, promotionUrgencyLabel, usePromotions } from "../context/PromotionContext";
import { sellers } from "../data/mockData";
import { useListings } from "../context/ListingContext";
import { useProfileMode } from "../context/ProfileModeContext";
import DistanceLabel from "../components/DistanceLabel";
import PromotionBadge from "../components/PromotionBadge";
import ConfirmationModal from "../components/ConfirmationModal";

function listingMatchesPromotion(promotion, listing) {
  const listingIds = [listing.id, listing.databaseId, listing.legacyId].filter(Boolean).map(String);
  return (promotion.productIds ?? []).some((id) => listingIds.includes(String(id)));
}

export default function Promotions() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const { promotionsForSeller, endPromotion, deletePromotion } = usePromotions();
  const { listings } = useListings();
  const { storeOpenedAt } = useProfileMode();
  const [openMenu, setOpenMenu] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const seller = sellers[sellerId] ?? { id: sellerId ?? "current-user", name: "your store" };
  const promotions = promotionsForSeller(seller.id, { createdAfter: storeOpenedAt });

  const runAction = async (promotionId, action, successMessage) => {
    setBusyId(promotionId);
    setOpenMenu(null);
    try {
      await action(promotionId);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message || "Unable to update promotion.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <MobileScreenLayout>
      <Header title="Promotions" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        <p className="text-[14px] text-[#828282]">Active promotions from {seller.name}</p>
        {message && <p role="status" className="mt-3 rounded-lg bg-[#F5FFF6] px-3 py-2 text-[13px] text-[#498467]">{message}</p>}
        {promotions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[18px] font-semibold">No promotions yet.</p>
            <p className="mt-2 text-[14px] text-[#828282]">Create your first promotion to bring attention to your listings.</p>
            <button type="button" onClick={() => navigate("/create-promotion")} className="mt-4 rounded-lg bg-[#498467] px-4 py-2.5 text-[13px] font-medium text-white">+ Create Promotion</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {promotions.map((promotion) => {
              const promotionListings = listings.filter((listing) => listingMatchesPromotion(promotion, listing));
              const primaryListing = promotionListings[0];
              return (
                <article key={promotion.id} className="relative rounded-xl border border-[#F3D38A] bg-gradient-to-br from-[#FFFDF5] to-[#F5FFF6] p-5 shadow-[0_5px_18px_rgba(73,132,103,0.14)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2"><PromotionBadge promotion={promotion} /><span className="text-[12px] font-medium text-[#6B756F]">{promotionUrgencyLabel(promotion)}</span></div>
                    <div className="relative">
                      <button type="button" aria-label={`Manage ${promotion.title}`} onClick={() => setOpenMenu((current) => current === promotion.id ? null : promotion.id)} className="rounded-full p-1.5 text-[#5D6D64] hover:bg-white"><MoreVertical className="h-5 w-5" /></button>
                      {openMenu === promotion.id && <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-[#DCEBE0] bg-white p-1.5 shadow-lg">
                        <ActionButton icon={Pencil} label="Edit Promotion" onClick={() => { setOpenMenu(null); navigate(`/edit-promotion/${promotion.id}`); }} />
                        <ActionButton icon={StopCircle} label="End Promotion" disabled={busyId === promotion.id} onClick={() => runAction(promotion.id, endPromotion, "Promotion ended")} />
                        {primaryListing && <ActionButton icon={ExternalLink} label="View Listing" onClick={() => { setOpenMenu(null); navigate(`/product/${primaryListing.id}`); }} />}
                        <ActionButton icon={Trash2} label="Delete Promotion" danger disabled={busyId === promotion.id} onClick={() => { setOpenMenu(null); setPendingDelete(promotion); }} />
                      </div>}
                    </div>
                  </div>
                  <h2 className="mt-4 text-[21px] font-bold">{promotion.title}</h2>
                  <p className="mt-1 text-[15px] font-semibold text-[#498467]">{promotionDisplayLabel(promotion)}</p>
                  <p className="mt-1 text-[12px] text-[#6B756F]">{promotionDaysRemaining(promotion) === null ? "No end date" : `${promotionDaysRemaining(promotion)} days remaining`}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#355F45]">{seller.name}</p>
                  <DistanceLabel content={seller} className="mt-1 block" />
                  <div className="mt-4 text-[13px] font-medium text-[#828282]">Attached listings:</div>
                  <div className="mt-2 flex flex-col gap-2 text-[14px] text-[#4F4F4F]">
                    {promotionListings.length > 0 ? promotionListings.map((listing) => <button type="button" key={listing.id} onClick={() => navigate(`/product/${listing.id}`)} className="flex items-center gap-3 rounded-lg bg-white/70 p-2 text-left hover:bg-white"><img src={listing.image || listing.images?.[0]} alt="" className="h-12 w-12 rounded-md bg-[#EEF5F0] object-cover" /><span className="flex-1 font-medium">{listing.name}</span><ExternalLink className="h-4 w-4 text-[#498467]" /></button>) : <div className="rounded-lg bg-white/60 p-3">No current listings</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {pendingDelete && <ConfirmationModal title="Delete Promotion?" message={`Delete “${pendingDelete.title}”? This cannot be undone.`} confirmLabel="Delete Promotion" onCancel={() => setPendingDelete(null)} onConfirm={() => { const promotion = pendingDelete; setPendingDelete(null); return runAction(promotion.id, deletePromotion, "Promotion deleted"); }} />}
    </MobileScreenLayout>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] disabled:opacity-50 ${danger ? "text-red-600 hover:bg-red-50" : "text-[#355F45] hover:bg-[#F1F8F2]"}`}><Icon className="h-4 w-4" />{label}</button>;
}
