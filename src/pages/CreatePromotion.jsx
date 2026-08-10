import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { PROMOTION_TYPES, usePromotions } from "../context/PromotionContext";
import { useListings } from "../context/ListingContext";
import { useProfileMode } from "../context/ProfileModeContext";

const SELLER_ID = "sarahs-backyard";

export default function CreatePromotion() {
  const navigate = useNavigate();
  const { addPromotion } = usePromotions();
  const { listings } = useListings();
  const { storeOpenedAt } = useProfileMode();
  const sellerProducts = listings.filter((product) => product.sellerId === SELLER_ID && Number(product.createdAt) >= storeOpenedAt);
  const [formData, setFormData] = useState({
    title: "",
    type: "percentage",
    value: "",
    productIds: sellerProducts[0] ? [sellerProducts[0].id] : [],
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: "",
  });

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleProduct = (productId) => {
    setFormData((current) => ({
      ...current,
      productIds: current.productIds.includes(productId)
        ? current.productIds.filter((id) => id !== productId)
        : [...current.productIds, productId],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    addPromotion({ ...formData, sellerId: SELLER_ID });
    navigate("/shop");
  };

  const needsValue = formData.type === "percentage" || formData.type === "dollar";

  return (
    <MobileScreenLayout>
      <Header title="Create Promotion" onBack={() => navigate("/shop")} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-6">
        <div>
          <label className="block text-[14px] font-medium mb-2">Promotion name</label>
          <input
            value={formData.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
            placeholder="e.g. Weekend harvest special"
            required
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Promotion type</label>
          <select
            value={formData.type}
            onChange={(event) => updateField("type", event.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
          >
            {PROMOTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {needsValue && (
          <div>
            <label className="block text-[14px] font-medium mb-2">
              {formData.type === "percentage" ? "Percent off" : "Amount off"}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-[#828282]">
                {formData.type === "percentage" ? "%" : "$"}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(event) => updateField("value", event.target.value)}
                className="w-full px-4 pl-8 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
                required
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-[14px] font-medium mb-2">Apply to listings</label>
          <div className="flex flex-col gap-2">
            {sellerProducts.map((product) => (
              <label key={product.id} className="flex items-center gap-3 rounded-lg border border-[#E6E6E6] p-3">
                <input
                  type="checkbox"
                  checked={formData.productIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="accent-[#498467]"
                />
                <span className="text-[14px]">{product.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[14px] font-medium mb-2">Starts</label>
            <input
              type="date"
              value={formData.startsAt}
              onChange={(event) => updateField("startsAt", event.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-medium mb-2">Ends</label>
            <input
              type="date"
              value={formData.endsAt}
              onChange={(event) => updateField("endsAt", event.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={formData.productIds.length === 0}
          className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px] disabled:opacity-50"
        >
          Publish Promotion
        </button>
      </form>
    </MobileScreenLayout>
  );
}
