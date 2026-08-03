import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";

export default function Cart() {
  const { items, updateQuantity, subtotal } = useCart();
  const { getPaymentMethods, fulfillmentMethod } = usePaymentMethods();
  const sellerId = items[0]?.sellerId ?? "sarahs-backyard";
  const fulfillmentSettings = getPaymentMethods(sellerId);
  const selectedFulfillment = fulfillmentSettings.fulfillmentMethods.includes(fulfillmentMethod) ? fulfillmentMethod : fulfillmentSettings.fulfillmentMethods[0] ?? "pickup";
  const deliveryFee = selectedFulfillment === "delivery" ? fulfillmentSettings.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  return (
    <div className="flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-[#E6E6E6]">
        <span className="text-[17px] font-semibold tracking-[-0.34px]">
          Cart
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2 border-b border-[#E6E6E6]">
        <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        <Row label="Fulfillment Method" value={selectedFulfillment === "delivery" ? "Delivery" : "Pickup"} />
        <Row label="Delivery Fee" value={deliveryFee === 0 ? "Free" : `$${deliveryFee.toFixed(2)}`} />
        <Row label="Total" value={`$${total.toFixed(2)}`} bold />
      </div>

      <div className="px-4 py-4">
        <Link to="/checkout" className="w-full rounded-lg bg-[#498467] text-white text-[16px] font-medium py-3.5 shadow-sm block text-center">
          Go to Checkout
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-[#E6E6E6]">
        <div className="text-[14px] font-medium">Saved for Later</div>
      </div>

      <div className="border-b-4 border-[#E6E6E6]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <span className="text-[12px] font-semibold text-[#B56576]">
            Sarah's Backyard
          </span>
          <span className="text-[14px] text-black/50">View Store</span>
        </div>

        <div className="px-4 py-3 border-b border-black/5">
          <div className="text-[12px] font-medium mb-3">ITEMS</div>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-[84px] h-[84px] rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="text-[12px] text-black/50">Brand</div>
                  <div className="text-[14px]">{item.name}</div>
                  <div className="text-[14px]">{item.description}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12px] text-black/50">Quantity</span>
                    <button
                      type="button"
                      aria-label={`Decrease quantity of ${item.name}`}
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={item.quantity === 1}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#E6E6E6] text-[16px] leading-none disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-[14px]">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label={`Increase quantity of ${item.name}`}
                      onClick={() => updateQuantity(item.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-[#498467] text-[16px] leading-none text-[#498467]"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-[14px]">${item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className={`text-[14px] ${bold ? "font-medium" : ""}`}>
        {label}
      </span>
      <span className={`text-[14px] ${bold ? "font-medium" : ""}`}>
        {value}
      </span>
    </div>
  );
}
