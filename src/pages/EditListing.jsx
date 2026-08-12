import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PhotoManager from "../components/PhotoManager";
import { useInventory } from "../context/InventoryContext";
import { useListings } from "../context/ListingContext";

export default function EditListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { listings, updateListing } = useListings();
  const product = listings.find((listing) => listing.id === id || listing.databaseId === id);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Produce");
  const [availableForTrade, setAvailableForTrade] = useState(false);
  const [desiredTradeItems, setDesiredTradeItems] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState([]);
  const [quantityAvailable, setQuantityAvailable] = useState(0);
  const [saveError, setSaveError] = useState("");
  const { updateAvailable } = useInventory();

  useEffect(() => {
    if (!product) return;
    setTitle(product.name || product.title || "");
    setPrice(product.price ?? 0);
    setDescription(product.description || "");
    setCategory(product.category || "Produce");
    setAvailableForTrade(product.availableForTrade ?? false);
    setDesiredTradeItems(product.desiredTradeItems ?? "");
    setLocation(product.location || "");
    setPhotos(product.images?.length ? product.images : product.image ? [product.image] : []);
    setQuantityAvailable(product.quantityAvailable ?? 0);
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    const normalizedQuantity = Number.isInteger(Number(quantityAvailable)) && Number(quantityAvailable) >= 0
      ? Number(quantityAvailable)
      : 0;
    setSaveError("");
    try {
      const updatedListing = await updateListing(product.id, {
        title,
        name: title,
        price: Number(price),
        quantityAvailable: normalizedQuantity,
        description,
        category,
        availableForTrade,
        desiredTradeItems: availableForTrade ? desiredTradeItems : "",
        location,
        images: photos,
        image: photos[0],
      });
      updateAvailable(updatedListing.id, normalizedQuantity);
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
              type="number"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              className="w-full p-3 pl-8 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
              step="0.01"
            />
          </div>
        </div>

        {/* Quantity Available */}
        <div className="mb-4">
          <label className="text-[14px] font-semibold mb-2 block">Quantity Available</label>
          <input
            type="number"
            value={quantityAvailable}
            onChange={(e) => setQuantityAvailable(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
            min="0"
            step="1"
            required
          />
        </div>

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
          </select>
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
          <label className="text-[14px] font-semibold mb-2 block">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 border border-[#E6E6E6] rounded-lg text-[14px] outline-none"
          />
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
