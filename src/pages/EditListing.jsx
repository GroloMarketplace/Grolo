import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PhotoManager from "../components/PhotoManager";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { formatLocation, friendlyLocation, locationFromLegacyText } from "../data/locations";
import { useListings } from "../context/ListingContext";

function VariantEditor({ variants, onChange }) {
  const updateVariant = (index, field, value) => onChange(variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant));
  return (
    <div className="mb-4 rounded-lg border border-[#E6E6E6] p-3">
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

export default function EditListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { listings, archivedListings, updateListing } = useListings();
  const product = [...listings, ...archivedListings].find((listing) => listing.id === id || listing.databaseId === id);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [serviceStatus, setServiceStatus] = useState("Accepting New Clients");
  const [listingStatus, setListingStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Produce");
  const [availableForTrade, setAvailableForTrade] = useState(false);
  const [desiredTradeItems, setDesiredTradeItems] = useState("");
  const [location, setLocation] = useState("");
  const [locationDetails, setLocationDetails] = useState(null);
  const [serviceLocations, setServiceLocations] = useState([]);
  const [serviceAreaRadius, setServiceAreaRadius] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [photos, setPhotos] = useState([]);
  const [quantityAvailable, setQuantityAvailable] = useState(0);
  const [variants, setVariants] = useState([]);
  const [availableForOrders, setAvailableForOrders] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!product) return;
    setTitle(product.name || product.title || "");
    setPrice(product.price ?? "");
    setServiceStatus(product.status === "Archived" ? "Archived" : product.serviceStatus || "Accepting New Clients");
    setListingStatus(product.status === "Archived" ? "Archived" : "Available");
    setDescription(product.description || "");
    setCategory(product.category || "Produce");
    setAvailableForTrade(product.availableForTrade ?? false);
    setDesiredTradeItems(product.desiredTradeItems ?? "");
    setLocation(formatLocation(product) || "");
    setLocationDetails(product.neighborhood || product.city || product.location ? { location: product.location, neighborhood: product.neighborhood, city: product.city, province: product.province, country: product.country, postalCode: product.postalCode, latitude: product.latitude, longitude: product.longitude } : null);
    const storedServiceLocations = Array.isArray(product.serviceLocations) && product.serviceLocations.length
      ? product.serviceLocations
      : [locationFromLegacyText(product.serviceArea || product.location)].filter(Boolean);
    setServiceLocations(storedServiceLocations);
    setServiceArea(formatLocation(product.serviceArea || product.location) || "");
    setServiceAreaRadius(product.serviceAreaRadius ?? "");
    setPhotos(product.images?.length ? product.images : product.image ? [product.image] : []);
    setQuantityAvailable(product.quantityAvailable ?? 0);
    setVariants(Array.isArray(product.variants) ? product.variants.map((variant) => ({ name: variant.name ?? "", price: variant.price ?? "" })) : []);
    setAvailableForOrders(product.availableForOrders !== false);
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    const isService = category === "Services";
    const hasVariants = variants.length > 0;
    const normalizedQuantity = !hasVariants && Number.isInteger(Number(quantityAvailable)) && Number(quantityAvailable) >= 0
      ? Number(quantityAvailable)
      : 0;
    if (variants.some((variant) => !variant.name.trim() || !Number.isFinite(Number(variant.price)) || Number(variant.price) <= 0)) {
      setSaveError("Each variant needs an option name and a price greater than $0.00.");
      return;
    }
    setSaveError("");
    try {
      await updateListing(product.id, {
        title,
        name: title,
        status: isService ? (serviceStatus === "Archived" ? "Archived" : "Active") : listingStatus === "Archived" ? "Archived" : "Active",
        price: isService ? price : Number(price),
        serviceStatus: isService ? serviceStatus : undefined,
        quantityAvailable: isService ? 0 : normalizedQuantity,
        availableForOrders: isService ? true : (hasVariants ? availableForOrders : true),
        variants: isService ? [] : variants.map((variant) => ({ name: variant.name.trim(), price: Number(variant.price) })),
        serviceArea: isService ? serviceArea : undefined,
        serviceLocations: isService ? serviceLocations : undefined,
        serviceAreaRadius: isService && serviceAreaRadius !== "" ? Number(serviceAreaRadius) : null,
        description,
        category,
        availableForTrade,
        desiredTradeItems: availableForTrade ? desiredTradeItems : "",
        location: isService ? serviceArea : formatLocation(locationDetails) || location,
        ...(isService && locationDetails ? { neighborhood: locationDetails.neighborhood, city: locationDetails.city, province: locationDetails.province, country: locationDetails.country, postalCode: locationDetails.postalCode, latitude: locationDetails.latitude, longitude: locationDetails.longitude } : {}),
        images: photos,
        image: photos[0],
      });
      navigate("/shop");
    } catch (error) {
      setSaveError(error.message || "Unable to save listing.");
    }
  };

  const handleCancel = () => {
    navigate("/shop");
  };

  if (!product) {
    return (
      <MobileScreenLayout>
        <Header title="Edit Listing" onBack={() => navigate("/shop")} />
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] text-[#828282]">Loading listing…</div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout>
      <Header title="Edit Listing" onBack={() => navigate("/shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
        {saveError && <p role="alert" className="mb-4 text-[13px] text-red-600">{saveError}</p>}
        {/* Title */}
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
          />
        </div>

        {/* Price */}
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#828282]">
              $
            </span>
            <input
              type={category === "Services" ? "text" : "number"}
              value={price}
              onChange={(e) => setPrice(category === "Services" ? e.target.value : parseFloat(e.target.value))}
              className="w-full p-3 pl-8 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
              step="0.01"
            />
          </div>
        </div>

        {category !== "Services" && <>
          {variants.length === 0 && <div className="mb-4">
            <label className="text-[14px] font-semibold mb-2 block">Quantity Available</label>
            <input type="number" value={quantityAvailable} onChange={(e) => setQuantityAvailable(e.target.value === "" ? "" : Number(e.target.value))} className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none" min="0" step="1" required />
          </div>}
          <VariantEditor variants={variants} onChange={setVariants} />
          {variants.length > 0 && <div className="mb-4 rounded-lg border border-[#E6E6E6] p-3">
            <p className="text-[14px] font-medium">Availability</p>
            <label className="mt-2 flex items-center gap-3 text-[14px]"><input type="checkbox" checked={availableForOrders} onChange={(event) => setAvailableForOrders(event.target.checked)} /> Available for Orders</label>
            <p className="mt-1 text-[12px] text-[#828282]">Inventory tracking is disabled for variant listings.</p>
          </div>}
        </>}

        {/* Description */}
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-24 p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none resize-none"
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
          >
            <option value="Produce">Produce</option>
            <option value="Bakery">Bakery</option>
            <option value="Crafts">Crafts</option>
            <option value="Other">Other</option>
            <option value="Services">Services</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Listing Status</label>
          <select
            value={category === "Services" ? serviceStatus : listingStatus}
            onChange={(event) => category === "Services" ? setServiceStatus(event.target.value) : setListingStatus(event.target.value)}
            className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
          >
            {(category === "Services"
              ? ["Accepting New Clients", "Temporarily Not Accepting New Clients", "Archived"]
              : ["Available", "Archived"]
            ).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <p className="mt-1 text-[12px] text-[#828282]">
            {category === "Services"
              ? serviceStatus === "Archived" ? "Hidden from marketplace and seller profiles." : serviceStatus === "Temporarily Not Accepting New Clients" ? "Visible, but not accepting new work." : "Visible and accepting inquiries."
              : listingStatus === "Archived" ? "Hidden from marketplace, profiles, and search." : "Visible, searchable, and available for purchase."
            }
          </p>
        </div>

        {/* Trade */}
        <div className="rounded-lg border border-[#E6E6E6] p-3 mb-4">
          <label className="flex items-center gap-3 text-[14px] font-medium">
            <input
              type="checkbox"
              checked={availableForTrade}
              onChange={(e) => setAvailableForTrade(e.target.checked)}
              className="h-4 w-4 accent-[#498467]"
            />
            Open to Trade
          </label>
          {availableForTrade && (
            <div className="mt-3">
              <label className="mb-2 block text-[14px] font-medium">Preferred Trade Items (optional)</label>
              <input
                type="text"
                value={desiredTradeItems}
                onChange={(e) => setDesiredTradeItems(e.target.value)}
                className="w-full rounded-lg border border-[#E6E6E6] px-4 py-3 text-[14px] outline-none focus:border-[#498467]"
                placeholder="e.g. Tomatoes, herbs, honey"
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="mb-4">
          {category === "Services" ? <>
            <LocationAutocomplete label="Service Area" value={serviceArea} locations={serviceLocations} multiple onChange={(values) => { const primary = values[0] ?? null; setServiceLocations(values); setLocationDetails(primary); setServiceArea(values.map((value) => formatLocation(value) || friendlyLocation(value)).join(", ")); setLocation(formatLocation(primary) || friendlyLocation(primary)); }} placeholder="Search a city or neighbourhood, then add more" required />
            <label className="mt-3 block text-[14px] font-medium">Optional Service Radius (km)<input type="number" min="0" max="500" value={serviceAreaRadius} onChange={(event) => setServiceAreaRadius(event.target.value)} placeholder="e.g. 25" className="mt-2 w-full rounded-lg border border-[#E6E6E6] p-3 text-[14px] outline-none" /></label>
          </> : <>
            <label className="text-[14px] font-semibold mb-2 block">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none" />
          </>}
        </div>

        {/* Images */}
        <div className="mb-6">
          <PhotoManager photos={photos} onChange={setPhotos} label="Photos" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 rounded-lg text-[14px] font-medium border border-[#E6E6E6]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-lg text-[14px] font-medium bg-[#498467] text-white"
          >
            Save Changes
          </button>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
