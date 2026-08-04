import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import PhotoManager from "../components/PhotoManager";
import { useSidebar } from "../hooks/useSidebar";
import { useListings } from "../context/ListingContext";
import { useInventory } from "../context/InventoryContext";

export default function CreateListing() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { listings, addListing } = useListings();
  const { updateAvailable } = useInventory();
  const [photos, setPhotos] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    quantityAvailable: "25",
    description: "",
    location: "",
    availableForTrade: false,
    desiredTradeItems: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const listing = {
      id: `${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: formData.title,
      category: formData.category,
      price: Number(formData.price),
      quantityAvailable: Number(formData.quantityAvailable),
      description: formData.description,
      location: formData.location,
      shop: "Sarah's Backyard",
      sellerId: "sarahs-backyard",
      status: "Active",
      image: photos[0] ?? "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800&q=80",
      images: photos.length ? photos : ["https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=800&q=80"],
      availableForTrade: formData.availableForTrade,
      desiredTradeItems: formData.desiredTradeItems,
      views: 0,
      favorites: 0,
      messages: 0,
      rating: 0,
      reviewCount: 0,
    };
    addListing(listing);
    updateAvailable(listing.id, listing.quantityAvailable);
    console.log("Listing Created:", listing.name);
    console.log("Listings Count:", listings.length + 1);
    navigate("/shop", { state: { listingCreated: listing.id, activeTab: "Listings" } });
  };

  return (
    <>
      <Header
        title="Create New Listing"
        onMenu={openSidebar}
        onBack={() => navigate("/shop")}
      />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-24">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-6 pb-8">
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
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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

          <div>
            <label className="block text-[14px] font-medium mb-2">Price</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-2">Quantity Available</label>
            <input
              type="number"
              value={formData.quantityAvailable}
              onChange={(e) => setFormData({ ...formData, quantityAvailable: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              placeholder="25"
              min="0"
              step="1"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] resize-none"
              rows="4"
              placeholder="Describe your listing..."
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium mb-2">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467]"
              placeholder="Enter location"
              required
            />
          </div>

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

          <PhotoManager photos={photos} onChange={setPhotos} />

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
