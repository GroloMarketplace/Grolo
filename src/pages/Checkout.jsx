import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useCart } from "../context/CartContext";
import { sellers } from "../data/mockData";
import { useSellerSettings } from "../context/SellerSettingsContext";

export default function Checkout() {
  const navigate = useNavigate();
  const { items } = useCart();
  const { getSellerProfile } = useSellerSettings();
  const groups = Object.entries(items.reduce((result, item) => {
    const sellerId = item.sellerId ?? "sarahs-backyard";
    if (!result[sellerId]) result[sellerId] = [];
    result[sellerId].push(item);
    return result;
  }, {}));

  return (
    <MobileScreenLayout>
      <Header title="Checkout Hub" onBack={() => navigate("/cart")} />
      <div className="flex-1 overflow-y-auto no-scrollbar"><div className="flex flex-col gap-3 px-4 py-5">
        <div className="rounded-lg bg-[#F5FFF6] p-4"><h2 className="text-[18px] font-semibold">Checkout by store</h2><p className="mt-1 text-[14px] text-[#4F4F4F]">Each store has its own payment and fulfillment options.</p></div>
        {groups.map(([sellerId, storeItems]) => { const vacationMode = getSellerProfile(sellerId)?.vacationMode; return <div key={sellerId} className="flex items-center justify-between rounded-lg border border-[#E6E6E6] p-4"><div><div className="text-[16px] font-semibold">{sellers[sellerId]?.name ?? "Local Store"}</div><div className="mt-1 text-[13px] text-[#828282]">{storeItems.reduce((sum, item) => sum + item.quantity, 0)} Items</div>{vacationMode && <div className="mt-1 text-[12px] font-medium text-[#4F4F4F]">This store is temporarily not accepting orders.</div>}</div>{vacationMode ? <span className="text-[13px] text-[#828282]">Checkout unavailable</span> : <Link to={`/checkout/${sellerId}`} className="text-[24px] text-[#498467]">›</Link>}</div>; })}
      </div></div>
    </MobileScreenLayout>
  );
}
