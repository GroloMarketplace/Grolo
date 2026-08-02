import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PhotoManager from "../components/PhotoManager";
import { products } from "../data/mockData";

export default function EditListing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const product = products.find((p) => p.id === id) || products[0];

  const [title, setTitle] = useState(product.name);
  const [price, setPrice] = useState(product.price);
  const [description, setDescription] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "Produce");
  const [location, setLocation] = useState(product.location || "Kensington, Calgary");
  const [photos, setPhotos] = useState(product.images ?? [product.image]);

  const handleSave = () => {
    // Handle saving the listing
    console.log("Saving listing:", {
      title,
      price,
      description,
      category,
      location,
      images: photos,
      image: photos[0],
    });
    navigate("/shop");
  };

  const handleCancel = () => {
    navigate("/shop");
  };

  return (
    <MobileScreenLayout>
      <Header title="Edit Listing" onBack={() => navigate("/shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar p-4">
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
