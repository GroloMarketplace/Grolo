import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { eventTypes } from "../data/mockData";
import { useEvents } from "../context/EventContext";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { addEvent } = useEvents();
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
  });

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    addEvent(formData);
    navigate("/my-shop/events");
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
          <div className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[14px] text-[#828282]">Upload event image</span>
          </div>
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
