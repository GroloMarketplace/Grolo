import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { PROMOTION_TYPES, usePromotions } from "../context/PromotionContext";
import { useListings } from "../context/ListingContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../lib/imageStorage";

const SUPPORTED_PROMOTION_TYPES = new Set(["percentage", "fixed_amount"]);

function validatePromotionForm(formData, selectedProducts) {
  if (!formData.title.trim()) return "Enter a promotion name.";
  if (!selectedProducts.length || selectedProducts.length !== new Set(formData.productIds).size) return "Select at least one active listing.";
  if (!SUPPORTED_PROMOTION_TYPES.has(formData.type)) return "Choose a supported pricing promotion.";
  const value = Number(formData.value);
  if (!Number.isFinite(value) || value <= 0) return "Enter a discount greater than zero.";
  if (formData.type === "percentage" && value > 100) return "Percentage discounts cannot be greater than 100%.";
  if (!formData.startsAt) return "Choose a promotion start date.";
  if (formData.endsAt && formData.endsAt < formData.startsAt) return "The end date cannot be before the start date.";
  if (formData.endsAt && formData.endsAt < new Date().toISOString().slice(0, 10)) return "The end date cannot be in the past.";
  if (formData.type === "fixed_amount" && selectedProducts.some((product) => {
    const price = Number(product.price);
    return Number.isFinite(price) && price > 0 && value >= price;
  })) return "Fixed discounts must be less than the selected listing price.";
  return "";
}

export default function CreatePromotion() {
  const navigate = useNavigate();
  const { addPromotion } = usePromotions();
  const { user } = useAuth();
  const { listings, loading: listingsLoading, error: listingsError } = useListings();
  const { storeOpenedAt } = useProfileMode();
  const sellerProducts = useMemo(() => listings.filter((product) => {
    if (product.sellerId !== user?.id || product.status !== "Active") return false;
    const createdAt = typeof product.createdAt === "number" ? product.createdAt : Date.parse(product.createdAt);
    return !storeOpenedAt || (Number.isFinite(createdAt) && createdAt >= storeOpenedAt);
  }), [listings, storeOpenedAt, user?.id]);
  const [formData, setFormData] = useState({
    title: "",
    type: "percentage",
    value: "",
    productIds: sellerProducts[0] ? [sellerProducts[0].id] : [],
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: "",
    image: "",
  });
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const availableIds = sellerProducts.map((product) => product.id);
    setFormData((current) => {
      const selectedIds = current.productIds.filter((id) => availableIds.includes(id));
      return selectedIds.length || !availableIds.length
        ? { ...current, productIds: selectedIds }
        : { ...current, productIds: [availableIds[0]] };
    });
  }, [sellerProducts]);

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

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError("");
    try {
      const { url } = await uploadImage(file, { userId: user?.id, kind: "promotion", folder: "promotions" });
      updateField("image", url);
    } catch (error) {
      setImageError(error.message || "Unable to upload image. Please try again.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    try {
      const selectedProducts = sellerProducts.filter((product) => formData.productIds.includes(product.id));
      const validationError = validatePromotionForm(formData, selectedProducts);
      if (validationError) {
        setFormError(validationError);
        return;
      }
      const realListingIds = selectedProducts.map((product) => product.databaseId ?? product.id);
      await addPromotion({
        ...formData,
        listingId: realListingIds[0] ?? null,
        productIds: realListingIds,
      });
      navigate("/shop");
    } catch (error) {
      setFormError(error.message || "Unable to create promotion.");
    }
  };

  const needsValue = true;

  return (
    <MobileScreenLayout>
      <Header title="Create Promotion" onBack={() => navigate("/shop")} />
      <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5 px-4 py-6 pb-12">
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
          {listingsLoading ? (
            <p className="rounded-lg bg-[#F5F5F5] p-3 text-[13px] text-[#828282]">Loading your listings...</p>
          ) : listingsError ? (
            <p className="rounded-lg bg-[#FFF1F0] p-3 text-[13px] text-[#B42318]">Unable to load your listings. Please refresh and try again.</p>
          ) : sellerProducts.length === 0 ? (
            <p className="rounded-lg bg-[#F5F5F5] p-3 text-[13px] text-[#828282]">No listings are available for this promotion.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sellerProducts.map((product) => {
                const selected = formData.productIds.includes(product.id);
                return (
                  <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${selected ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6]"}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 accent-[#498467]"
                    />
                    <span className="text-[14px]">{product.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Promotion image</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="w-full text-[13px] text-[#828282] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CFF7D3] file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-[#02542D]" />
          {formData.image && <img src={formData.image} alt="Promotion preview" className="mt-3 h-32 w-full rounded-lg object-cover" />}
          {imageError && <p role="alert" className="mt-2 text-[12px] text-red-600">{imageError}</p>}
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

        {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{formError}</p>}
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
