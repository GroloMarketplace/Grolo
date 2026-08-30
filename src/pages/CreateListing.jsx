import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PhotoManager from "../components/PhotoManager";
import { useSidebar } from "../hooks/useSidebar";
import { useListings } from "../context/ListingContext";
import { useAuth } from "../context/AuthContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { validateListing } from "../utils/validation";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { friendlyLocation } from "../data/locations";
import { clearLocalDraft, hasDraftContent, readLocalDraft, saveLocalDraft } from "../utils/localDrafts";

const CANADIAN_PROVINCES = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"];

function TextField({ label, type = "text", value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="mb-2 block text-[14px] font-medium">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={type === "number" ? "0" : undefined} step={type === "number" ? "0.01" : undefined} className="w-full rounded-lg border border-[#E6E6E6] px-4 py-3 focus:border-[#498467] focus:outline-none" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required }) {
  return (
    <div>
      <label className="mb-2 block text-[14px] font-medium">{label}</label>
      <select value={value} onChange={onChange} required={required} className="w-full rounded-lg border border-[#E6E6E6] px-4 py-3 focus:border-[#498467] focus:outline-none">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => { const optionValue = typeof option === "string" ? option : option.value; const optionLabel = typeof option === "string" ? option : option.label; return <option key={optionValue} value={optionValue}>{optionLabel}</option>; })}
      </select>
    </div>
  );
}

function VariantEditor({ variants, onChange }) {
  const updateVariant = (index, field, value) => onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant));
  return (
    <div className="rounded-lg border border-[#E6E6E6] p-3">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[14px] font-medium">Variants <span className="font-normal text-[#828282]">(optional)</span></p><p className="mt-1 text-[12px] text-[#828282]">Offer package sizes or options with their own prices.</p></div>
        <button type="button" onClick={() => onChange([...variants, { name: "", price: "" }])} className="shrink-0 text-[13px] font-medium text-[#498467]">Add variant</button>
      </div>
      {variants.length > 0 && <div className="mt-3 flex flex-col gap-2">
        {variants.map((variant, index) => <div key={`variant-${index}`} className="flex items-end gap-2">
          <label className="min-w-0 flex-1"><span className="mb-1 block text-[12px] text-[#828282]">Option Name</span><input value={variant.name} onChange={(event) => updateVariant(index, "name", event.target.value)} placeholder="e.g. Half Dozen" className="w-full rounded-lg border border-[#E6E6E6] px-3 py-2 text-[14px] outline-none focus:border-[#498467]" /></label>
          <label className="w-28"><span className="mb-1 block text-[12px] text-[#828282]">Price</span><input type="number" min="0.01" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} placeholder="0.00" className="w-full rounded-lg border border-[#E6E6E6] px-3 py-2 text-[14px] outline-none focus:border-[#498467]" /></label>
          <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))} className="h-9 px-2 text-[18px] text-[#B42318]">×</button>
        </div>)}
      </div>}
    </div>
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { listings, addListing } = useListings();
  const { user } = useAuth();
  const { getSellerProfile } = useSellerSettings();
  const draftKey = `grolo-draft:listing:${user?.id ?? "anonymous"}`;
  const [existingDraft] = useState(() => readLocalDraft(draftKey));
  const [draftChoice, setDraftChoice] = useState(existingDraft ? null : "none");
  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    pricingType: "",
    serviceStatus: "Accepting New Clients",
    quantityAvailable: "25",
    variants: [],
    availableForOrders: true,
    serviceType: "",
    availability: "",
    yearsOfExperience: "",
    preferredContactMethod: "Message Through Grolo",
    responseTime: "",
    description: "",
    location: "",
    locationDetails: null,
    serviceArea: "",
    serviceAreaType: "city",
    serviceLocations: [],
    serviceProvince: "",
    serviceAreaRadius: "",
    availableForTrade: false,
    desiredTradeItems: "",
  });

  useEffect(() => {
    if (draftChoice !== "resume" || !existingDraft) return;
    setFormData((current) => ({ ...current, ...(existingDraft.formData ?? {}), variants: existingDraft.formData?.variants ?? [] }));
    setPhotos(Array.isArray(existingDraft.photos) ? existingDraft.photos : []);
  }, [draftChoice, existingDraft]);

  useEffect(() => {
    if (draftChoice === null) return;
    if (hasDraftContent({
      title: formData.title,
      category: formData.category,
      price: formData.price,
      description: formData.description,
      location: formData.location,
      serviceArea: formData.serviceArea,
      serviceAreaType: formData.serviceAreaType,
      serviceLocations: formData.serviceLocations,
      serviceProvince: formData.serviceProvince,
      serviceAreaRadius: formData.serviceAreaRadius,
      serviceStatus: formData.serviceStatus,
      locationDetails: formData.locationDetails,
      quantityAvailable: formData.quantityAvailable !== "25" ? formData.quantityAvailable : "",
      serviceType: formData.serviceType,
      availability: formData.availability,
      yearsOfExperience: formData.yearsOfExperience,
      preferredContactMethod: formData.preferredContactMethod !== "Message Through Grolo" ? formData.preferredContactMethod : "",
      responseTime: formData.responseTime,
      availableForTrade: formData.availableForTrade,
      desiredTradeItems: formData.desiredTradeItems,
      photos,
    })) saveLocalDraft(draftKey, { formData, photos });
  }, [draftChoice, draftKey, formData, photos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const isService = formData.category === "Services";
    const validationError = validateListing(formData, isService);
    if (!formData.category) {
      setSubmitError("Choose a listing category.");
      return;
    }
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    if (photos.length > 5) {
      setSubmitError("You can upload up to 5 listing images.");
      return;
    }
    if (formData.variants.some((variant) => !variant.name.trim() || !Number.isFinite(Number(variant.price)) || Number(variant.price) <= 0)) {
      setSubmitError("Each variant needs an option name and a price greater than $0.00.");
      return;
    }
    try {
    const listing = {
      id: `${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      title: formData.title,
      name: formData.title,
      category: formData.category,
      price: isService ? formData.price : Number(formData.price),
      variants: isService ? [] : formData.variants.map((variant) => ({ name: variant.name.trim(), price: Number(variant.price) })),
      ...(isService ? {
        pricingType: formData.pricingType,
        serviceStatus: formData.serviceStatus,
        serviceType: formData.serviceType,
        serviceArea: formData.serviceArea,
        serviceAreaType: formData.serviceAreaType,
        serviceLocations: formData.serviceLocations,
        serviceProvince: formData.serviceProvince,
        serviceAreaRadius: formData.serviceAreaRadius ? Number(formData.serviceAreaRadius) : null,
        availability: formData.availability,
        yearsOfExperience: formData.yearsOfExperience,
        preferredContactMethod: formData.preferredContactMethod,
        responseTime: formData.responseTime,
      } : {
        quantityAvailable: formData.variants.length ? 0 : Number(formData.quantityAvailable),
        availableForOrders: formData.variants.length ? formData.availableForOrders !== false : true,
      }),
      description: formData.description,
      location: isService ? formData.serviceArea : formData.location,
      neighborhood: formData.locationDetails?.neighborhood,
      city: formData.locationDetails?.city,
      province: formData.locationDetails?.province,
      country: formData.locationDetails?.country,
      postalCode: formData.locationDetails?.postalCode,
      latitude: formData.locationDetails?.latitude,
      longitude: formData.locationDetails?.longitude,
      shop: getSellerProfile(user?.id ?? "current-user").name,
      sellerId: user?.id ?? "current-user",
      status: "Active",
      image: photos[0] ?? "",
      images: photos,
      availableForTrade: formData.availableForTrade,
      desiredTradeItems: formData.desiredTradeItems,
      views: 0,
      favorites: 0,
      messages: 0,
      rating: 0,
      reviewCount: 0,
    };
    const createdListing = await addListing(listing);
    clearLocalDraft(draftKey);
    navigate(`/product/${createdListing.id}`, { state: { listingCreated: createdListing.id } });
    } catch (error) {
      console.error("Unable to create listing", {
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null,
      });
      setSubmitError(error?.message || "We couldn't publish your listing. Please review the form and try again.");
    }
  };

  const isService = formData.category === "Services";
  const updateField = (field) => (event) => setFormData({ ...formData, [field]: event.target.value });

  return (
    <>
      <Header
        title="Create New Listing"
        onMenu={openSidebar}
        onBack={() => navigate("/shop")}
      />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-24">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-6 pb-8">
          {draftChoice === null && (
            <div className="rounded-lg border border-[#DCEBE0] bg-[#F5FFF6] p-4">
              <p className="text-[14px] font-semibold">Continue your unfinished draft?</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setDraftChoice("resume")} className="flex-1 rounded-lg bg-[#498467] py-2 text-[13px] font-medium text-white">Resume Draft</button>
                <button type="button" onClick={() => { clearLocalDraft(draftKey); setDraftChoice("discard"); }} className="flex-1 rounded-lg border border-[#E6E6E6] py-2 text-[13px] font-medium">Discard Draft</button>
              </div>
            </div>
          )}
          {submitError && <pre role="alert" className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{submitError}</pre>}
          <div>
            <label className="block text-[14px] font-medium mb-2">Listing Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              placeholder="Enter listing title"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-2">Category</label>
            <select
              value={formData.category}
              onChange={updateField("category")}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              required
            >
              <option value="">Select category</option>
              <option value="Garden">Garden</option>
              <option value="Bakery">Bakery</option>
              <option value="Crafts">Crafts</option>
              <option value="Meal Prep">Meal Prep</option>
              <option value="Services">Services</option>
            </select>
          </div>

          {isService ? (
            <>
              <SelectField label="Service Type" value={formData.serviceType} onChange={updateField("serviceType")} options={["Home Services", "Lawn Care", "Snow Removal", "House Cleaning", "Pet Care", "Tutoring", "Photography", "Graphic Design", "Web Design", "Event Services", "Health & Wellness", "Trades & Repairs", "Other"]} required />
              <SelectField label="Pricing Type" value={formData.pricingType} onChange={updateField("pricingType")} options={["Fixed Price", "Starting At", "Hourly Rate", "Contact for Quote", "Custom Pricing"]} required />
              <TextField label="Price or Pricing Details" value={formData.price} onChange={updateField("price")} placeholder="Optional — e.g. $40 / hour or starting at $100" />
              <SelectField label="Service Area Type" value={formData.serviceAreaType} onChange={(event) => { const type = event.target.value; setFormData((current) => ({ ...current, serviceAreaType: type, serviceArea: type === "nationwide" ? "Canada" : type === "province" ? current.serviceProvince : current.serviceArea, serviceLocations: type === "province" || type === "nationwide" ? [] : current.serviceLocations })); }} options={["city", "cities", "radius", "province", "nationwide"].map((type) => ({ value: type, label: { city: "Entire City", cities: "Multiple Cities", radius: "Radius Based", province: "Province Wide", nationwide: "Nationwide" }[type] }))} required />
              {(formData.serviceAreaType === "city" || formData.serviceAreaType === "cities" || formData.serviceAreaType === "radius") && <LocationAutocomplete label={formData.serviceAreaType === "radius" ? "Radius Origin" : "Service Area"} value={formData.serviceArea} locations={formData.serviceLocations} multiple={formData.serviceAreaType === "cities"} onChange={(values) => { const selected = Array.isArray(values) ? values : [values].filter(Boolean); const primary = selected[0] ?? null; setFormData((current) => ({ ...current, serviceLocations: selected, locationDetails: primary, serviceArea: selected.map((value) => `${friendlyLocation(value)}${value.scope === "city" ? " (Entire City)" : ""}`).join(", "), location: friendlyLocation(primary) })); }} placeholder="Search any Canadian city, town, address, or postal code" required />}
              {formData.serviceAreaType === "province" && <SelectField label="Province" value={formData.serviceProvince} onChange={(event) => setFormData((current) => ({ ...current, serviceProvince: event.target.value, serviceArea: event.target.value }))} options={CANADIAN_PROVINCES} required />}
              {formData.serviceAreaType === "nationwide" && <p className="rounded-lg bg-[#F1F8F2] p-3 text-[13px] text-[#315D47]">This service is available across Canada.</p>}
              {formData.serviceAreaType === "radius" && <TextField label="Service Radius (km)" type="number" value={formData.serviceAreaRadius} onChange={updateField("serviceAreaRadius")} placeholder="e.g. 25" required />}
              <p className="-mt-4 text-[12px] text-[#828282]">Search locations anywhere in Canada, including small towns, rural communities, addresses, and postal codes.</p>
              <SelectField label="Service Status" value={formData.serviceStatus} onChange={updateField("serviceStatus")} options={["Accepting New Clients", "Limited Availability", "Waitlist Available", "Temporarily Not Accepting New Clients", "Archived"]} required />
              <SelectField label="Availability" value={formData.availability} onChange={updateField("availability")} options={["Weekdays", "Weekends", "Evenings", "By Appointment", "Flexible"]} required />
              <TextField label="Years of Experience" value={formData.yearsOfExperience} onChange={updateField("yearsOfExperience")} placeholder="e.g. 5 Years" />
              <SelectField label="Preferred Contact Method" value={formData.preferredContactMethod} onChange={updateField("preferredContactMethod")} options={["Message Through Grolo", "Email", "Phone", "Text Message"]} required />
              <SelectField label="Typical Response Time" value={formData.responseTime} onChange={updateField("responseTime")} options={["Within 1 hour", "Within 24 hours", "Same day", "1-2 business days"]} />
            </>
          ) : (
            <>
              <TextField label="Base Price" type="number" value={formData.price} onChange={updateField("price")} placeholder="0.00" required />
              {formData.variants.length === 0 && <TextField label="Quantity Available" type="number" value={formData.quantityAvailable} onChange={updateField("quantityAvailable")} placeholder="25" required />}
              <VariantEditor
                variants={formData.variants}
                onChange={(variants) => setFormData((current) => ({ ...current, variants }))}
              />
              {formData.variants.length > 0 && <div className="mt-3 rounded-lg border border-[#E6E6E6] p-3">
                <p className="text-[14px] font-medium">Availability</p>
                <label className="mt-2 flex items-center gap-3 text-[14px]">
                  <input type="checkbox" checked={formData.availableForOrders} onChange={(event) => setFormData((current) => ({ ...current, availableForOrders: event.target.checked }))} />
                  Available for Orders
                </label>
                <p className="mt-1 text-[12px] text-[#828282]">Variant listings use seller-managed availability; inventory tracking is disabled.</p>
              </div>}
            </>
          )}

          <div>
            <label className="block text-[14px] font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] resize-none"
              rows="4"
              placeholder={isService ? "What do you offer?\nWho do you serve?\nWhat makes your service unique?\nAny certifications or special training?" : "Describe your listing..."}
              required
            />
          </div>

          {!isService && <LocationAutocomplete label="Location" value={formData.location} location={formData.locationDetails} onChange={(value) => setFormData((current) => ({ ...current, locationDetails: value, location: friendlyLocation(value) }))} required />}

          <div className="rounded-lg border border-[#E6E6E6] p-3">
            <label className="flex items-center gap-3 text-[14px] font-medium">
              <input
                type="checkbox"
                checked={formData.availableForTrade}
                onChange={(e) => setFormData({ ...formData, availableForTrade: e.target.checked })}
                className="h-4 w-4 accent-[#498467]"
              />
              Available for Trade
            </label>
            {formData.availableForTrade && (
              <div className="mt-3">
                <label className="mb-2 block text-[14px] font-medium">What are you looking for?</label>
                <input
                  type="text"
                  value={formData.desiredTradeItems}
                  onChange={(e) => setFormData({ ...formData, desiredTradeItems: e.target.value })}
                  className="w-full rounded-lg border border-[#E6E6E6] px-4 py-3 focus:border-[#498467] focus:outline-none"
                  placeholder="e.g. Tomatoes, herbs, honey"
                  required
                />
              </div>
            )}
          </div>

          <PhotoManager photos={photos} onChange={setPhotos} label={isService ? "Portfolio Photos" : "Photos"} />

          <button
            type="submit"
            className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px]"
          >
            Publish Listing
          </button>
        </form>
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
