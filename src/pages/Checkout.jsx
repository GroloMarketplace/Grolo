import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useCart } from "../context/CartContext";
import { sellers } from "../data/mockData";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useListings } from "../context/ListingContext";
import { getCartItemProductId, groupCartItemsByStore } from "../utils/cartGrouping";

export default function Checkout() {
  const navigate = useNavigate();
  const { items } = useCart();
  const { getSellerProfile } = useSellerSettings();
  const { listings } = useListings();
  const activeItems = items.filter((item) => {
    const listing = listings.find((candidate) => candidate.id === getCartItemProductId(item, listings));
    return Number(listing?.quantityAvailable) > 0;
  });
  const groups = groupCartItemsByStore(activeItems, listings);
  const storeNames = groups.map(([sellerId]) => sellers[sellerId]?.name ?? sellerId);
  const storeNamesKey = storeNames.join(",");

  useEffect(() => {
    console.info("Checkout Stores:", storeNamesKey ? storeNamesKey.split(",") : []);
  }, [storeNamesKey]);

  return (
    <MobileScreenLayout>
      <Header title="Checkout Hub" onBack={() => navigate("/cart")} />
      <div className="flex-1 overflow-y-auto no-scrollbar"><div className="flex flex-col gap-3 px-4 py-5">
        <div className="rounded-lg bg-[#F5FFF6] p-4"><h2 className="text-[18px] font-semibold">Checkout by store</h2><p className="mt-1 text-[14px] text-[#4F4F4F]">Each store has its own payment and fulfillment options.</p></div>
        {groups.map(([sellerId, storeItems]) => {
          const vacationMode = getSellerProfile(sellerId)?.vacationMode;
          const handleStoreClick = () => {
            if (vacationMode) return;
            console.info("Store card clicked");
            console.info("Store ID", sellerId);
            console.info("Navigating to Store Checkout");
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
                <div className="text-[16px] font-semibold">{sellers[sellerId]?.name ?? "Local Store"}</div>
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
