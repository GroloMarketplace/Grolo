import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PhotoManager from "../components/PhotoManager";
import { useSidebar } from "../hooks/useSidebar";
import { useListings } from "../context/ListingContext";
import { useAuth } from "../context/AuthContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { validateListing } from "../utils/validation";

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
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { listings, addListing } = useListings();
  const { user } = useAuth();
  const { getSellerProfile } = useSellerSettings();
  const [photos, setPhotos] = useState([]);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    pricingType: "",
    quantityAvailable: "25",
    serviceType: "",
    serviceArea: "",
    availability: "",
    yearsOfExperience: "",
    preferredContactMethod: "Message Through Grolo",
    responseTime: "",
    description: "",
    location: "",
    availableForTrade: false,
    desiredTradeItems: "",
  });

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
    try {
    const listing = {
      id: `${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      title: formData.title,
      name: formData.title,
      category: formData.category,
      price: isService ? formData.price : Number(formData.price),
      ...(isService ? {
        pricingType: formData.pricingType,
        serviceType: formData.serviceType,
        serviceArea: formData.serviceArea,
        availability: formData.availability,
        yearsOfExperience: formData.yearsOfExperience,
        preferredContactMethod: formData.preferredContactMethod,
        responseTime: formData.responseTime,
      } : { quantityAvailable: Number(formData.quantityAvailable) }),
      description: formData.description,
      location: isService ? formData.serviceArea : formData.location,
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
    console.log("Listing Created:", createdListing.name);
    console.log("Listings Count:", listings.length + 1);
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
              <SelectField label="Pricing Type" value={formData.pricingType} onChange={updateField("pricingType")} options={["Hourly Rate", "Fixed Price", "Starting At", "Free Quote", "Custom Pricing"]} required />
              <TextField label="Price or Pricing Details" value={formData.price} onChange={updateField("price")} placeholder="e.g. $40 / Hour or Starting at $100" required />
              <TextField label="Service Area" value={formData.serviceArea} onChange={updateField("serviceArea")} placeholder="e.g. Northwest Calgary, Alberta Wide, Remote / Online" required />
              <SelectField label="Availability" value={formData.availability} onChange={updateField("availability")} options={["Weekdays", "Weekends", "Evenings", "By Appointment", "Flexible"]} required />
              <TextField label="Years of Experience" value={formData.yearsOfExperience} onChange={updateField("yearsOfExperience")} placeholder="e.g. 5 Years" />
              <SelectField label="Preferred Contact Method" value={formData.preferredContactMethod} onChange={updateField("preferredContactMethod")} options={["Message Through Grolo", "Email", "Phone", "Text Message"]} required />
              <SelectField label="Typical Response Time" value={formData.responseTime} onChange={updateField("responseTime")} options={["Within 1 hour", "Within 24 hours", "Same day", "1-2 business days"]} />
            </>
          ) : (
            <>
              <TextField label="Price" type="number" value={formData.price} onChange={updateField("price")} placeholder="0.00" required />
              <TextField label="Quantity Available" type="number" value={formData.quantityAvailable} onChange={updateField("quantityAvailable")} placeholder="25" required />
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

          {!isService && <div>
            <label className="block text-[14px] font-medium mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              placeholder="Enter location"
              required
            />
          </div>}

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
