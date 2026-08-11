import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { eventTypes } from "../data/mockData";
import { useEvents } from "../context/EventContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../lib/imageStorage";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { addEvent } = useEvents();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [imageError, setImageError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    image: "",
  });

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const openImagePicker = () => fileInputRef.current?.click();

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError("");
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    try {
      const { url } = await uploadImage(file, { userId: user?.id, kind: "event", folder: "events" });
      update("image", url);
    } catch (error) {
      setImageError(error.message || "Unable to upload image. Please try again.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addEvent(formData);
    navigate("/", { state: { tab: "Your Community", communityFilter: "Events", eventCreated: true } });
  };

  return (
    <MobileScreenLayout>
      <Header title="Create Event" onBack={() => navigate("/my-shop/events")} />
      <form
        onSubmit={handleSubmit}
        className="overflow-y-auto flex-1 no-scrollbar flex flex-col gap-6 px-4 py-6"
      >
        <div>
          <label className="block text-[14px] font-medium mb-2">Event Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
            placeholder="Enter event title"
            required
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Event Type</label>
          <select
            value={formData.type}
            onChange={(e) => update("type", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
            required
          >
            <option value="">Select event type</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => update("date", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
            required
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[14px] font-medium mb-2">Start Time</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-medium mb-2">End Time</label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => update("location", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
            placeholder="Enter location"
            required
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => update("description", e.target.value)}
            rows="4"
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] resize-none text-[14px]"
            placeholder="Describe your event..."
            required
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Event Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="hidden"
          />
          {formData.image ? (
            <div className="flex flex-col gap-2">
              <img
                src={formData.image}
                alt="Event preview"
                className="w-full h-[180px] rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={openImagePicker}
                className="w-full rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]"
              >
                Change Image
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openImagePicker}
              className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5]"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[14px] text-[#828282]">Upload event image</span>
              <span className="text-[12px] text-[#828282]">Optional · JPG, PNG, or WEBP · a default image will be used if skipped</span>
            </button>
          )}
          {imageError && <p className="mt-2 text-[13px] font-medium text-red-600">{imageError}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px]"
        >
          Publish Event
        </button>
      </form>
    </MobileScreenLayout>
  );
}
