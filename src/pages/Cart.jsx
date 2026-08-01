import { Link } from "react-router-dom";
import { cartItems } from "../data/mockData";

export default function Cart() {
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = 2;
  const total = subtotal + tax;

  return (
    <div className="flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-[#E6E6E6]">
        <span className="text-[17px] font-semibold tracking-[-0.34px]">
          Cart
        </span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2 border-b border-[#E6E6E6]">
        <Row label={`Subtotal (${cartItems.length})`} value={`$${subtotal.toFixed(2)}`} />
        <Row label="Shipping total" value="Free" />
        <Row label="Taxes" value={`$${tax.toFixed(2)}`} />
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
            {cartItems.map((item) => (
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
                  <div className="text-[14px]">Quantity: {String(item.quantity).padStart(2, "0")}</div>
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
