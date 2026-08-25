import { useEffect, useState } from "react";
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
import { useListings } from "../context/ListingContext";
import { getCartItemProductId, getCartItemSellerId } from "../utils/cartGrouping";
import { trackAnalyticsEvent } from "../lib/api/analytics";
import { validateFulfillment } from "../utils/validation";
import { createId } from "../utils/createId";

const CHECKOUT_ATTEMPT_KEY = "grolo-checkout-attempt";

function createAttemptId() {
  return createId("attempt");
}

function createOrderId() {
  return `ORD-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
}

function persistCheckoutAttempt(attempt) {
  try {
    window.sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
  }
}

export default function StoreCheckout() {
  const navigate = useNavigate();
  const { sellerId } = useParams();
  const { items, getItemPricing } = useCart();
  const { getPaymentMethods } = usePaymentMethods();
  const { address } = useDeliveryAddress();
  const { getSellerProfile } = useSellerSettings();
  const { listings } = useListings();
  const getListing = (item) => listings.find((listing) => listing.id === getCartItemProductId(item, listings));
  const allStoreItems = items.filter((item) => getCartItemSellerId(item, listings) === sellerId);
  const seller = sellers[sellerId] ?? { id: sellerId, name: "Seller" };
  const storeListing = getListing(allStoreItems[0]);
  const sellerProfile = getSellerProfile(seller.id);
  const settings = getPaymentMethods(seller.id);
  const stockStatus = allStoreItems.map((item) => {
    const listing = getListing(item);
    const hasVariants = Array.isArray(listing?.variants) && listing.variants.length > 0;
    const inventoryValue = listing?.inventory_quantity ?? listing?.quantityAvailable ?? item.inventory_quantity ?? item.quantityAvailable;
    const available = hasVariants
      ? (listing?.availableForOrders === false || item.availableForOrders === false ? 0 : Infinity)
      : Math.max(0, Number(inventoryValue) || 0);
    return {
      listingId: listing?.databaseId ?? listing?.id ?? item.listingId ?? item.productId ?? null,
      inventoryValue: inventoryValue ?? null,
      calculatedAvailableStock: available,
      soldOut: available <= 0 || item.quantity > available,
      requestedQuantity: item.quantity,
    };
  });
  const inventoryAvailable = stockStatus.length > 0 && stockStatus.every(({ soldOut }) => !soldOut);
  const storeItems = allStoreItems.filter((_, index) => !stockStatus[index].soldOut);
  const storeName = storeListing?.shop || sellerProfile.name || seller.name;
  const pickupAddress = sellerProfile.pickupLocation || sellerProfile.location || settings.pickupLocation;
  const pickupSettings = { ...settings, pickupLocation: pickupAddress };
  const vacationMode = sellerProfile.vacationMode;
  const checkoutButtonState = vacationMode ? "Orders Paused" : inventoryAvailable ? "Checkout" : "Sold Out";

  useEffect(() => {
    console.info("Store Checkout inventory diagnostics", {
      sellerId,
      stockStatus,
      inventoryAvailable,
      soldOut: !inventoryAvailable,
      checkoutButtonState,
    });
  }, [checkoutButtonState, inventoryAvailable, sellerId, stockStatus]);

  useEffect(() => {
    console.info("Store Checkout pickup data returned", {
      storeId: sellerId,
      storeName,
      pickupAddress,
    });
  }, [pickupAddress, sellerId, storeName]);
  const [fulfillmentMethod, setFulfillmentMethod] = useStoreFulfillment(settings.fulfillmentMethods);
  const [showMapSheet, setShowMapSheet] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const selected = settings.fulfillmentMethods.includes(fulfillmentMethod) ? fulfillmentMethod : settings.fulfillmentMethods[0] ?? "pickup";
  const subtotal = storeItems.reduce((sum, item) => sum + getItemPricing(item).discountedPrice * item.quantity, 0);
  const deliveryFee = selected === "delivery" ? settings.deliveryFee : 0;

  return (
    <MobileScreenLayout>
      <Header title={storeName} onBack={() => navigate("/checkout")} />
      <div className="flex-1 overflow-y-auto no-scrollbar"><div className="flex flex-col gap-5 px-4 py-5">
        {vacationMode && <div className="rounded-lg bg-[#F5FFF6] p-4 text-[14px] text-[#4F4F4F]">This store is temporarily not accepting orders.</div>}
        <section><h2 className="mb-3 text-[18px] font-semibold">Payment methods</h2><PaymentMethods settings={settings} /></section>
        <section><h2 className="mb-3 text-[18px] font-semibold">Fulfillment method</h2>{settings.fulfillmentMethods.length > 1 ? <select value={selected} onChange={(event) => setFulfillmentMethod(event.target.value)} className="w-full rounded-lg border border-[#E6E6E6] bg-white px-3 py-3 text-[14px] outline-none">{settings.fulfillmentMethods.map((method) => <option key={method} value={method}>{method === "delivery" ? "Delivery" : "Pickup"}</option>)}</select> : <div className="rounded-lg border border-[#E6E6E6] px-3 py-3 text-[14px]">Pickup</div>}</section>
        {selected === "pickup" ? <PickupLocation settings={pickupSettings} onMap={() => setShowMapSheet(true)} /> : <DeliveryInformation settings={settings} address={address} onAddress={() => navigate("/delivery-address")} />}
        <section><h2 className="mb-3 text-[18px] font-semibold">Store items</h2><div className="flex flex-col gap-3">{storeItems.map((item) => <div key={item.id} className="flex gap-3 rounded-lg border border-[#E6E6E6] p-3"><img src={item.image} alt={item.name} className="h-16 w-16 rounded-lg object-cover" /><div className="flex-1"><div className="text-[14px] font-medium">{item.name}</div><div className="text-[12px] text-[#828282]">Quantity: {item.quantity}</div></div><div className="text-right text-[14px]">{getItemPricing(item).discountedPrice < getItemPricing(item).originalPrice && <div className="text-[11px] text-[#828282] line-through">${(getItemPricing(item).originalPrice * item.quantity).toFixed(2)}</div>}<div>${(getItemPricing(item).discountedPrice * item.quantity).toFixed(2)}</div></div></div>)}</div></section>
        <div className="flex flex-col gap-2 border-t border-[#E6E6E6] pt-4"><Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} /><Row label="Fulfillment Method" value={selected === "delivery" ? "Delivery" : "Pickup"} />{selected === "delivery" && <>{address && <DeliveryAddressSummary address={address} />}<Row label="Delivery Fee" value={`$${deliveryFee.toFixed(2)}`} /></>}<Row label="Total" value={`$${(subtotal + deliveryFee).toFixed(2)}`} /></div>
        {checkoutError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700">{checkoutError}</p>}
        {vacationMode ? <div className="w-full rounded-lg bg-[#E6E6E6] py-3.5 text-center text-[16px] font-medium text-[#828282]">Orders Paused</div> : !inventoryAvailable ? <div className="w-full rounded-lg bg-[#E6E6E6] py-3.5 text-center text-[16px] font-medium text-[#828282]">Sold Out</div> : <button type="button" onClick={() => {
          const validationError = validateFulfillment(selected, settings, address);
          if (validationError) {
            setCheckoutError(validationError);
            return;
          }
          setCheckoutError("");
          if (selected === "delivery" && !address) {
            navigate("/delivery-address");
            return;
          }
          const attempt = {
            attemptId: createAttemptId(),
            orderId: createOrderId(),
            sellerId,
            fulfillmentMethod: selected,
            deliveryFee,
            deliveryAddress: address,
            items: storeItems,
            status: "creating",
          };
          persistCheckoutAttempt(attempt);
          void trackAnalyticsEvent("checkout_started", {
            sellerId,
            listingId: getListing(storeItems[0])?.databaseId,
            eventKey: `checkout-started:${attempt.attemptId}`,
            metadata: { attempt_id: attempt.attemptId },
          });
          navigate("/order-confirmation", { state: { checkoutAttempt: attempt } });
        }} className="w-full rounded-lg bg-[#498467] py-3.5 text-[16px] font-medium text-white">Place Order</button>}
      </div></div>
      {showMapSheet && <MapOptionsSheet address={pickupAddress} onClose={() => setShowMapSheet(false)} />}
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
