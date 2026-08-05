import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useCart } from "../context/CartContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useDeliveryAddress } from "../context/DeliveryAddressContext";
import MapOptionsSheet from "../components/MapOptionsSheet";
import { sellers } from "../data/mockData";
import OutlineIcon from "../components/OutlineIcon";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useInventory } from "../context/InventoryContext";
import { useListings } from "../context/ListingContext";
import { getCartItemProductId, getCartItemSellerId } from "../utils/cartGrouping";

export default function StoreCheckout() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const { items } = useCart();
  const { getPaymentMethods } = usePaymentMethods();
  const { address } = useDeliveryAddress();
  const { getSellerProfile } = useSellerSettings();
  const { getAvailable } = useInventory();
  const { listings } = useListings();
  const allStoreItems = items.filter((item) => getCartItemSellerId(item, listings) === sellerId);
  const inventoryAvailable = allStoreItems.length > 0 && allStoreItems.every((item) => {
    const available = getAvailable(getCartItemProductId(item, listings));
    return available > 0 && item.quantity <= available;
  });
  const storeItems = allStoreItems.filter((item) => getAvailable(getCartItemProductId(item, listings)) > 0);
  const seller = sellers[sellerId] ?? sellers["sarahs-backyard"];
  const settings = getPaymentMethods(seller.id);
  const vacationMode = getSellerProfile(seller.id)?.vacationMode;
  const [fulfillmentMethod, setFulfillmentMethod] = useStoreFulfillment(settings.fulfillmentMethods);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const selected = settings.fulfillmentMethods.includes(fulfillmentMethod) ? fulfillmentMethod : settings.fulfillmentMethods[0] ?? "pickup";
  const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = selected === "delivery" ? settings.deliveryFee : 0;

  return (
    <MobileScreenLayout>
      <Header title={seller.name} onBack={() => navigate("/checkout")} />
      <div className="flex-1 overflow-y-auto no-scrollbar"><div className="flex flex-col gap-5 px-4 py-5">
        {vacationMode && <div className="rounded-lg bg-[#F5FFF6] p-4 text-[14px] text-[#4F4F4F]">This store is temporarily not accepting orders.</div>}
        <section><h2 className="mb-3 text-[18px] font-semibold">Payment methods</h2><PaymentMethods settings={settings} /></section>
        <section><h2 className="mb-3 text-[18px] font-semibold">Fulfillment method</h2>{settings.fulfillmentMethods.length > 1 ? <select value={selected} onChange={(event) => setFulfillmentMethod(event.target.value)} className="w-full rounded-lg border border-[#E6E6E6] bg-white px-3 py-3 text-[14px] outline-none">{settings.fulfillmentMethods.map((method) => <option key={method} value={method}>{method === "delivery" ? "Delivery" : "Pickup"}</option>)}</select> : <div className="rounded-lg border border-[#E6E6E6] px-3 py-3 text-[14px]">Pickup</div>}</section>
        {selected === "pickup" ? <PickupLocation settings={settings} onMap={() => setShowMapSheet(true)} /> : <DeliveryInformation settings={settings} address={address} onAddress={() => navigate("/delivery-address")} />}
        <section><h2 className="mb-3 text-[18px] font-semibold">Store items</h2><div className="flex flex-col gap-3">{storeItems.map((item) => <div key={item.id} className="flex gap-3 rounded-lg border border-[#E6E6E6] p-3"><img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" /><div className="flex-1"><div className="text-[14px] font-medium">{item.name}</div><div className="text-[12px] text-[#828282]">Quantity: {item.quantity}</div></div><div className="text-[14px]">${(item.price * item.quantity).toFixed(2)}</div></div>)}</div></section>
        <div className="flex flex-col gap-2 border-t border-[#E6E6E6] pt-4"><Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} /><Row label="Fulfillment Method" value={selected === "delivery" ? "Delivery" : "Pickup"} />{selected === "delivery" && <>{address && <DeliveryAddressSummary address={address} />}<Row label="Delivery Fee" value={`$${deliveryFee.toFixed(2)}`} /></>}<Row label="Total" value={`$${(subtotal + deliveryFee).toFixed(2)}`} /></div>
        {vacationMode ? <div className="w-full rounded-lg bg-[#E6E6E6] py-3.5 text-center text-[16px] font-medium text-[#828282]">Orders Paused</div> : !inventoryAvailable ? <div className="w-full rounded-lg bg-[#E6E6E6] py-3.5 text-center text-[16px] font-medium text-[#828282]">Sold Out</div> : <button type="button" onClick={() => { if (selected === "delivery" && !address) { navigate("/delivery-address"); return; } navigate("/order-confirmation", { state: { sellerId, fulfillmentMethod: selected } }); }} className="w-full rounded-lg bg-[#498467] py-3.5 text-[16px] font-medium text-white">Place Order</button>}
      </div></div>
      {showMapSheet && <MapOptionsSheet address={settings.pickupLocation} onClose={() => setShowMapSheet(false)} />}
    </MobileScreenLayout>
  );
}

function PickupLocation({ settings, onMap }) {
  return <section className="rounded-lg border border-[#E6E6E6] p-3"><h2 className="text-[18px] font-semibold">Pickup Location</h2><p className="mt-2 flex items-center gap-1 text-[14px]"><OutlineIcon name="home" size={15} className="text-[#498467]" /> {settings.pickupLocation}</p>{settings.pickupNotes && <p className="mt-2 text-[13px] text-[#828282]">{settings.pickupNotes}</p>}<button type="button" onClick={onMap} className="mt-3 text-[14px] font-medium text-[#498467]">View on Map ›</button></section>;
}
function DeliveryInformation({ settings, address, onAddress }) {
  return <section className="rounded-lg border border-[#E6E6E6] p-3"><h2 className="text-[18px] font-semibold">Delivery Information</h2><div className="mt-2 flex flex-col gap-1 text-[14px] text-[#4F4F4F]"><div>Delivery Radius: {settings.deliveryRadius} km</div><div>Delivery Fee: ${settings.deliveryFee.toFixed(2)}</div></div><div className="mt-3 border-t border-[#E6E6E6] pt-3"><div className="text-[14px] font-medium">Delivery Address</div>{address ? <><DeliveryAddressSummary address={address} /><button type="button" onClick={onAddress} className="mt-2 text-[14px] font-medium text-[#498467]">Edit Address</button></> : <button type="button" onClick={onAddress} className="mt-2 w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]">Add Delivery Address</button>}</div></section>;
}

function DeliveryAddressSummary({ address }) {
  return <div className="mt-2 text-[13px] text-[#4F4F4F]"><div className="flex items-center gap-1"><OutlineIcon name="home" size={15} className="text-[#498467]" /> {address.streetAddress}{address.unit ? `, ${address.unit}` : ""}</div><div>{address.city}, {address.province} {address.postalCode}</div></div>;
}

function useStoreFulfillment(initial) {
  const [value, setValue] = useState(initial[0] ?? "pickup");
  return [value, setValue];
}
function PaymentMethods({ settings }) { return <div className="rounded-lg bg-[#F5FFF6] p-3 text-[13px]">{settings.methods.includes("cash") && <div>Cash · Pay at pickup</div>}{settings.methods.includes("etransfer") && <div className="mt-1">E-Transfer Available</div>}<div className="mt-1 text-[12px] text-[#828282]">Credit/Debit (Coming Soon)</div></div>; }
function Row({ label, value }) { return <div className="flex justify-between text-[14px]"><span>{label}</span><span>{value}</span></div>; }
