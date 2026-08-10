import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAdvertising } from "../context/AdvertisingContext";
import { events, products, promotions } from "../data/mockData";

const SELLER_ID = "current-user";
const AD_TYPES = ["Store", "Product", "Event", "Promotion"];
const BADGE_LABELS = ["New Listing", "Top Seller", "Featured", "Trending", "Community Spotlight"];

function fieldClassName() {
  return "w-full rounded-lg border border-[#E6E6E6] px-3 py-2.5 text-[14px] outline-none focus:border-[#498467]";
}

function getDestinationRoute(type, destinationId) {
  if (type === "Store") return `/seller/${destinationId}`;
  if (type === "Event") return `/event/${destinationId}`;
  return `/listing/${destinationId}`;
}

export default function CreateAdvertisingAd() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addAd, getAd, updateAd } = useAdvertising();
  const editingAd = getAd(searchParams.get("adId"));
  const [formData, setFormData] = useState(() => editingAd ?? {
    title: "",
    description: "",
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
    type: "Store",
    destinationType: "Store profile",
    destinationId: SELLER_ID,
    destinationRoute: `/seller/${SELLER_ID}`,
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: "",
    badgeLabel: "Featured",
  });

  const destinations = useMemo(() => {
    if (formData.type === "Product") return products.filter((product) => product.sellerId === SELLER_ID).map((product) => ({ id: product.id, label: product.name, destinationType: "Product listing" }));
    if (formData.type === "Event") return events.filter((event) => event.sellerId === SELLER_ID).map((event) => ({ id: event.id, label: event.title, destinationType: "Event detail page" }));
    if (formData.type === "Promotion") return promotions.filter((promotion) => promotion.sellerId === SELLER_ID).map((promotion) => ({ id: promotion.productIds?.[0] ?? promotion.id, label: promotion.title, destinationType: "Product listing" }));
    return [{ id: SELLER_ID, label: "My store", destinationType: "Store profile" }];
  }, [formData.type]);

  useEffect(() => {
    if (!destinations.some((destination) => destination.id === formData.destinationId)) {
      const destination = destinations[0];
      setFormData((current) => ({
        ...current,
        destinationId: destination?.id ?? "",
        destinationType: destination?.destinationType ?? "",
        destinationRoute: getDestinationRoute(current.type, destination?.id ?? ""),
      }));
    }
  }, [destinations, formData.destinationId]);

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const handleTypeChange = (type) => {
    const destination = type === "Product"
      ? products.find((product) => product.sellerId === SELLER_ID)
      : type === "Event"
        ? events.find((event) => event.sellerId === SELLER_ID)
        : type === "Promotion"
          ? promotions.find((promotion) => promotion.sellerId === SELLER_ID)
          : { id: SELLER_ID };
    const destinationType = type === "Product" ? "Product listing" : type === "Event" ? "Event detail page" : type === "Promotion" ? "Product listing" : "Store profile";
    updateField("type", type);
    const destinationId = type === "Promotion" ? destination?.productIds?.[0] ?? destination?.id ?? "" : destination?.id ?? "";
    updateField("destinationId", destinationId);
    updateField("destinationType", destinationType);
    updateField("destinationRoute", getDestinationRoute(type, destinationId));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) updateField("image", URL.createObjectURL(file));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (editingAd) updateAd(editingAd.id, formData);
    else addAd(formData);
    navigate("/my-shop/advertising");
  };

  return (
    <MobileScreenLayout>
      <Header title={editingAd ? "Edit Ad" : "Create Ad"} onBack={() => navigate("/my-shop/advertising")} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">
          <div className="rounded-lg bg-[#F5FFF6] p-3 text-[13px] leading-[140%] text-[#4F4F4F]">
            Community Spotlight ads receive boosted visibility across Grolo discovery. Your first ad starts a 30-day free trial, then costs $4.99 per week.
          </div>

          <FormField label="Ad title">
            <input required value={formData.title} onChange={(event) => updateField("title", event.target.value)} placeholder="e.g. Weekend promotion" className={fieldClassName()} />
          </FormField>
          <FormField label="Description">
            <textarea required value={formData.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Tell local shoppers what makes this special" rows="3" className={fieldClassName()} />
          </FormField>
          <FormField label="Upload image">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-[13px] text-[#828282] file:mr-3 file:rounded-lg file:border-0 file:bg-[#CFF7D3] file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-[#02542D]" />
          </FormField>
          <FormField label="Ad type">
            <select value={formData.type} onChange={(event) => handleTypeChange(event.target.value)} className={fieldClassName()}>
              {AD_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </FormField>
          <FormField label="Image badge">
            <select value={formData.badgeLabel ?? "Featured"} onChange={(event) => updateField("badgeLabel", event.target.value)} className={fieldClassName()}>
              {BADGE_LABELS.map((label) => <option key={label}>{label}</option>)}
            </select>
            <p className="mt-1 text-[12px] text-[#828282]">Paid placements may show this badge on listing images.</p>
          </FormField>
          <FormField label="Select destination">
            <select
              value={formData.destinationId}
              onChange={(event) => {
                updateField("destinationId", event.target.value);
                updateField("destinationRoute", getDestinationRoute(formData.type, event.target.value));
              }}
              className={fieldClassName()}
            >
              {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
            </select>
            <p className="mt-1 text-[12px] text-[#828282]">Opens: {formData.destinationType}</p>
          </FormField>
          <div className="flex gap-3">
            <FormField label="Start date" className="flex-1">
              <input required type="date" value={formData.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} className={fieldClassName()} />
            </FormField>
            <FormField label="End date" className="flex-1">
              <input type="date" value={formData.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} className={fieldClassName()} />
            </FormField>
          </div>

          <section className="rounded-lg border border-[#E6E6E6] p-3">
            <h2 className="text-[16px] font-semibold">Preview ad</h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-[#E6E6E6]">
              <img src={formData.image} alt="Ad preview" className="h-[136px] w-full object-cover" />
              <div className="p-3"><p className="text-[16px] font-semibold">{formData.title || "Your ad title"}</p><p className="mt-1 text-[13px] text-[#828282]">{formData.description || "Your ad description"}</p></div>
            </div>
          </section>

          <button type="submit" className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">{editingAd ? "Save Changes" : "Start 30-Day Trial"}</button>
        </form>
      </div>
    </MobileScreenLayout>
  );
}

function FormField({ label, children, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-[14px] font-medium">{label}</span>{children}</label>;
}
