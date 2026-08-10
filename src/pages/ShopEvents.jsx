import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import EventCard from "../components/EventCard";
import { useEvents } from "../context/EventContext";

export default function ShopEvents() {
  const navigate = useNavigate();
  const { upcomingEvents, pastEvents, storeId } = useEvents();
  const upcoming = upcomingEvents(storeId);
  const past = pastEvents(storeId);

  return (
    <MobileScreenLayout>
      <Header title="Store Events" onBack={() => navigate("/shop")} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        <div className="px-4 py-4">
          <button
            onClick={() => navigate("/create-event")}
            className="w-full bg-[#498467] text-white py-3 rounded-lg text-[14px] font-medium"
          >
            + New Event
          </button>
        </div>

        <Section title="Upcoming Events" events={upcoming} />
        <Section title="Past Events" events={past} />
      </div>
    </MobileScreenLayout>
  );
}

function Section({ title, events }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-[16px] font-semibold tracking-[-0.32px]">{title}</h2>
        <span className="text-[12px] text-[#828282]">{events.length}</span>
      </div>
      {events.length === 0 ? (
        <div className="px-4 py-3 text-[14px] text-[#828282]">
          No events yet. Host your first community event.
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
