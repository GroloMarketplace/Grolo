import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { eventTypes } from "../data/mockData";
import { useEvents } from "../context/EventContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../lib/imageStorage";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { formatLocation, friendlyLocation } from "../data/locations";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public · Anyone on Grolo can see this event" },
  { value: "community", label: "Community Only · Visible to your followers" },
];

export default function EditEvent() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { getEvent, updateEvent } = useEvents();
  const { user } = useAuth();
  const event = getEvent(eventId);
  const fileInputRef = useRef(null);
  const [imageError, setImageError] = useState("");
  const [formData, setFormData] = useState(() => ({
    title: event?.title ?? "",
    type: event?.type ?? "",
    date: event?.date ?? "",
    startTime: event?.startTime ?? "",
    endTime: event?.endTime ?? "",
    location: event?.location ?? "",
    locationDetails: event?.neighborhood || event?.city || event?.location ? { location: event.location, neighborhood: event.neighborhood, city: event.city, province: event.province, country: event.country, postalCode: event.postalCode, latitude: event.latitude, longitude: event.longitude } : null,
    description: event?.description ?? "",
    image: event?.image ?? "",
    capacity: event?.capacity ?? "",
    visibility: event?.visibility ?? "public",
  }));

  useEffect(() => {
    if (!event) return;
    setFormData({
      title: event.title ?? "",
      type: event.type ?? "",
      date: event.date ?? "",
      startTime: event.startTime ?? "",
      endTime: event.endTime ?? "",
      location: event.location ?? "",
      locationDetails: event.neighborhood || event.city || event.location ? { location: event.location, neighborhood: event.neighborhood, city: event.city, province: event.province, country: event.country, postalCode: event.postalCode, latitude: event.latitude, longitude: event.longitude } : null,
      description: event.description ?? "",
      image: event.image ?? "",
      capacity: event.capacity ?? "",
      visibility: event.visibility ?? "public",
    });
  }, [event?.id]);

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const openImagePicker = () => fileInputRef.current?.click();

  const handleImageChange = async (changeEvent) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
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

  const removeImage = () => {
    setImageError("");
    update("image", "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const location = formData.locationDetails ?? {};
    updateEvent(eventId, { ...formData, location: formatLocation(location) || formData.location, neighborhood: location.neighborhood, city: location.city, province: location.province, country: location.country, postalCode: location.postalCode, latitude: location.latitude, longitude: location.longitude });
    navigate("/shop", { state: { activeTab: "Events", eventUpdated: true } });
  };

  if (!event) {
    return (
      <MobileScreenLayout>
        <Header title="Edit Event" onBack={() => navigate(-1)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[16px] font-semibold">Event not found</p>
          <p className="text-[14px] text-[#828282]">This event may have been deleted.</p>
        </div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout>
      <Header title="Edit Event" onBack={() => navigate(-1)} />
      <form
        onSubmit={handleSubmit}
        className="overflow-y-auto flex-1 no-scrollbar flex flex-col gap-6 px-4 py-6"
      >
        <div>
          <label className="block text-[14px] font-medium mb-2">Event Name</label>
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
          <label className="block text-[14px] font-medium mb-2">Event Category</label>
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

        <LocationAutocomplete label="Location" value={formData.location} location={formData.locationDetails} onChange={(value) => { update("locationDetails", value); update("location", friendlyLocation(value)); }} required />

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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openImagePicker}
                  className="flex-1 rounded-lg border border-[#498467] py-2.5 text-[14px] font-medium text-[#498467]"
                >
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={removeImage}
                  className="flex-1 rounded-lg border border-red-500 py-2.5 text-[14px] font-medium text-red-500"
                >
                  Remove Image
                </button>
              </div>
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

        <div>
          <label className="block text-[14px] font-medium mb-2">Capacity <span className="font-normal text-[#828282]">(optional)</span></label>
          <input
            type="number"
            min="0"
            value={formData.capacity}
            onChange={(e) => update("capacity", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
            placeholder="Maximum attendees (leave blank for unlimited)"
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium mb-2">Event Visibility</label>
          <select
            value={formData.visibility}
            onChange={(e) => update("visibility", e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[#E6E6E6] focus:outline-none focus:border-[#498467] text-[14px]"
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-lg border border-[#E6E6E6] py-3 text-[16px] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white"
          >
            Save Changes
          </button>
        </div>
      </form>
    </MobileScreenLayout>
  );
}
