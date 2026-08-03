import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { sellers } from "../data/mockData";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function Cart() {
  const navigate = useNavigate();
  const { items, updateQuantity, totalQuantity, subtotal } = useCart();
  const storeGroups = Object.values(items.reduce((groups, item) => {
    const sellerId = item.sellerId ?? "sarahs-backyard";
    if (!groups[sellerId]) groups[sellerId] = [];
    groups[sellerId].push(item);
    return groups;
  }, {}));

  return (
    <MobileScreenLayout>
      <div className="shrink-0">
        <div className="flex h-14 items-center justify-center border-b border-[#E6E6E6]"><span className="text-[17px] font-semibold">Cart</span></div>
      <div className="flex flex-col gap-2 border-b border-[#E6E6E6] px-4 py-4">
        <Row label={`${totalQuantity} Items`} value={`${storeGroups.length} Stores`} />
        <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
      </div>
      <div className="px-4 py-4">
        <Link to="/checkout" className="block w-full rounded-lg bg-[#498467] py-3.5 text-center text-[16px] font-medium text-white">Proceed to Checkout</Link>
      </div>
        <div className="border-b border-[#E6E6E6] px-4 py-3"><div className="text-[14px] font-medium">Saved for Later</div></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="border-b-4 border-[#E6E6E6]">
        {Object.entries(items.reduce((groups, item) => {
          const sellerId = item.sellerId ?? "sarahs-backyard";
          if (!groups[sellerId]) groups[sellerId] = [];
          groups[sellerId].push(item);
          return groups;
        }, {})).map(([sellerId, storeItems]) => (
          <section key={sellerId} className="border-b border-black/5 last:border-0">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] font-normal text-[#498467]">{sellers[sellerId]?.name ?? "Local Store"}</span>
              <button type="button" onClick={() => navigate(`/seller/${sellerId}`)} className="text-[14px] font-normal text-[#498467]">View Store <span aria-hidden="true" className="text-[16px] text-[#498467]">›</span></button>
            </div>
            <div className="px-4 py-3"><div className="mb-3 text-[12px] font-medium">ITEMS</div><div className="flex flex-col gap-4">{storeItems.map((item) => <CartItem key={item.id} item={item} updateQuantity={updateQuantity} />)}</div></div>
          </section>
        ))}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function CartItem({ item, updateQuantity }) {
  return <div className="flex gap-3"><img src={item.image} alt={item.name} className="h-[84px] w-[84px] rounded-lg object-cover" /><div className="flex-1"><div className="text-[12px] text-black/50">{item.description}</div><div className="text-[14px]">{item.name}</div><div className="mt-2 flex items-center gap-2"><span className="text-[12px] text-black/50">Quantity</span><button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity === 1} className="flex h-7 w-7 items-center justify-center rounded border border-[#E6E6E6] text-[16px] disabled:opacity-40">−</button><span className="min-w-5 text-center text-[14px]">{item.quantity}</span><button type="button" aria-label={`Increase quantity of ${item.name}`} onClick={() => updateQuantity(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded border border-[#498467] text-[#498467]">+</button></div></div><div className="text-[14px]">${item.price.toFixed(2)}</div></div>;
}

function Row({ label, value }) { return <div className="flex justify-between"><span className="text-[14px]">{label}</span><span className="text-[14px]">{value}</span></div>; }
