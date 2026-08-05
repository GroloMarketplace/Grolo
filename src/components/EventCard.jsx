import { useNavigate } from "react-router-dom";
import {
  eventStatus,
  formatEventDate,
  formatEventTime,
} from "../context/EventContext";
import { EventAttendanceCount } from "./EventRsvp";
import { sellers } from "../data/mockData";

const BADGE_STYLES = {
  Today: "bg-[#498467] text-white",
  Upcoming: "bg-[#CFF7D3] text-[#02542D]",
  Past: "bg-[#F5F5F5] text-[#828282]",
};

export default function EventCard({ event, showStore }) {
  const navigate = useNavigate();
  const status = eventStatus(event);

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className="w-full text-left rounded-lg border border-[#E6E6E6] overflow-hidden"
    >
      <div className="relative">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-[136px] object-cover"
        />
        <span className={`absolute right-2 top-2 text-[12px] font-medium px-2 py-1 rounded-full whitespace-nowrap shadow-sm ${BADGE_STYLES[status]}`}>
          {status}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="min-w-0 truncate text-[14px] font-semibold">{event.title}</span>
        </div>
        <span className="text-[12px] text-[#498467] font-medium">
          {event.type}
        </span>
        {showStore && (
          <span className="text-[12px] text-[#828282]">
            {sellers[event.sellerId]?.name}
          </span>
        )}
        <span className="text-[12px] text-[#828282]">
          {formatEventDate(event.date)} • {formatEventTime(event.startTime)} –{" "}
          {formatEventTime(event.endTime)}
        </span>
        <EventAttendanceCount eventId={event.id} />
        <span className="text-[12px] text-[#828282]">{event.location}</span>
        <p className="text-[14px] mt-1 leading-[140%] line-clamp-2">
          {event.description}
        </p>
      </div>
    </button>
  );
}
