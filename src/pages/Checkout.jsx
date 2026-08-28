import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useCart } from "../context/CartContext";
import { sellers } from "../data/mockData";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useListings } from "../context/ListingContext";
import { getCartItemProductId, getCartItemStoreName, groupCartItemsByStore } from "../utils/cartGrouping";

export default function Checkout() {
  const navigate = useNavigate();
  const { items } = useCart();
  const { getSellerProfile } = useSellerSettings();
  const { listings } = useListings();
  const activeItems = items.filter((item) => {
    const listing = listings.find((candidate) => candidate.id === getCartItemProductId(item, listings));
    const hasVariants = Array.isArray(listing?.variants) && listing.variants.length > 0;
    const available = hasVariants
      ? (listing?.availableForOrders === false || item.availableForOrders === false ? 0 : Infinity)
      : Number(listing?.inventory_quantity ?? listing?.quantityAvailable ?? item.inventory_quantity ?? item.quantityAvailable) || 0;
    return available > 0;
  });
  const groups = groupCartItemsByStore(activeItems, listings);
  const stores = groups.map(([sellerId, storeItems]) => ({
    sellerId,
    storeName: getCartItemStoreName(storeItems[0], listings) ?? sellers[sellerId]?.name ?? sellerId,
    itemCount: storeItems.length,
  }));
  const storesKey = JSON.stringify(stores);

  useEffect(() => {
  }, [activeItems.length, groups.length, items.length, storesKey]);

  return (
    <MobileScreenLayout>
      <Header title="Checkout Hub" onBack={() => navigate("/cart")} />
      <div className="flex-1 overflow-y-auto no-scrollbar"><div className="flex flex-col gap-3 px-4 py-5">
        <div className="rounded-lg bg-[#F5FFF6] p-4"><h2 className="text-[18px] font-semibold">Checkout by store</h2><p className="mt-1 text-[14px] text-[#4F4F4F]">Each store has its own payment and fulfillment options.</p></div>
        {groups.map(([sellerId, storeItems]) => {
          const storeName = getCartItemStoreName(storeItems[0], listings) ?? sellers[sellerId]?.name ?? sellerId;
          const vacationMode = getSellerProfile(sellerId)?.vacationMode;
          const handleStoreClick = () => {
            if (vacationMode) return;
            navigate(`/checkout/${sellerId}`);
          };
          return (
            <div
              key={sellerId}
              role={vacationMode ? undefined : "button"}
              tabIndex={vacationMode ? undefined : 0}
              onClick={handleStoreClick}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") handleStoreClick();
              }}
              className={`flex items-center justify-between rounded-lg border border-[#E6E6E6] p-4 ${vacationMode ? "" : "cursor-pointer"}`}
            >
              <div>
                <div className="text-[16px] font-semibold">{storeName}</div>
                <div className="mt-1 text-[13px] text-[#828282]">{storeItems.reduce((sum, item) => sum + item.quantity, 0)} Items</div>
                {vacationMode && <div className="mt-1 text-[12px] font-medium text-[#4F4F4F]">This store is temporarily not accepting orders.</div>}
              </div>
              {vacationMode ? <span className="text-[13px] text-[#828282]">Checkout unavailable</span> : <Link to={`/checkout/${sellerId}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleStoreClick(); }} className="text-[24px] text-[#498467]">›</Link>}
            </div>
          );
        })}
      </div></div>
    </MobileScreenLayout>
  );
}
