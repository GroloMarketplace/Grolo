import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useSidebar } from "../hooks/useSidebar";

export default function CreateListing() {
  const navigate = useNavigate();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    price: "",
    description: "",
    location: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log("Listing created:", formData);
    navigate("/shop");
  };

  return (
    <>
      <Header
        title="Create New Listing"
        onMenu={openSidebar}
        onBack={() => navigate("/shop")}
      />
      <MobileScreenLayout>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-6">
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

          <div>
            <label className="block text-[14px] font-medium mb-2">Image</label>
            <div className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[14px] text-[#828282]">Upload image</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px]"
          >
            Publish Listing
          </button>
        </form>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
