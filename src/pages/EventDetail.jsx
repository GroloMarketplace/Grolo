import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import {
  eventStatus,
  formatEventDate,
  formatEventTime,
  useEvents,
} from "../context/EventContext";
import EventRsvp from "../components/EventRsvp";
import DistanceLabel from "../components/DistanceLabel";
import OfficialBadge from "../components/OfficialBadge";
import UnavailableAccount from "../components/UnavailableAccount";
import TrustSafetyActions from "../components/TrustSafetyActions";
import { formatLocation } from "../data/locations";
import { useBlockedAccount } from "../hooks/useBlockedAccount";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { getEvent, eventSeller } = useEvents();
  const event = getEvent(eventId);
  const blocked = useBlockedAccount(event?.sellerId);

  if (blocked) return <UnavailableAccount onBack={() => navigate(-1)} />;

  if (!event) {
    return (
      <MobileScreenLayout>
        <Header title="Event" onBack={() => navigate(-1)} />
        <div className="overflow-y-auto flex-1 no-scrollbar px-4 py-8 text-center text-[14px] text-[#828282]">
          This event is no longer available.
        </div>
      </MobileScreenLayout>
    );
  }

  const seller = eventSeller(event);
  const status = eventStatus(event);

  return (
    <MobileScreenLayout>
      <Header title="Event" onBack={() => navigate(-1)} />
      <div className="overflow-y-auto flex-1 no-scrollbar">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-[200px] object-cover"
        />

        <div className="px-4 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-[24px] font-semibold tracking-[-0.48px]">
                {event.title}
              </h1>
              <TrustSafetyActions contentType="event" contentId={event.id} reportedUserId={event.sellerId ?? seller?.id} compact />
              <span
                className={`text-[12px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                  status === "Past"
                    ? "bg-[#F5F5F5] text-[#828282]"
                    : "bg-[#CFF7D3] text-[#02542D]"
                }`}
              >
                {status}
              </span>
            </div>
            <span className="inline-flex w-fit items-center rounded-lg bg-[#CFF7D3] text-[#02542D] text-[14px] px-2 py-1">
              {event.type}
            </span>
            {seller && (
              <button
                onClick={() => navigate(`/seller/${seller.id}`)}
                className="w-fit text-[16px] text-[#498467] hover:underline"
              >
                {seller.name}
              </button>
            )}
            <OfficialBadge accountId={seller?.id ?? event.sellerId} className="self-center" />
            <DistanceLabel content={event} />
          </div>

          <div className="rounded-lg border border-[#E6E6E6] p-4 flex flex-col gap-3">
            <DetailRow label="Date" value={formatEventDate(event.date)} />
            <DetailRow
              label="Time"
              value={`${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`}
            />
            <DetailRow label="Location" value={formatLocation(event)} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">About this event</h2>
            <p className="whitespace-pre-wrap text-[14px] leading-[140%]">{event.description}</p>
          </div>

          <EventRsvp eventId={event.id} />

          {seller && (
            <button
              onClick={() => navigate(`/seller/${seller.id}`)}
              className="w-full bg-[#498467] text-white py-3 rounded-lg font-medium text-[16px]"
            >
              View Store
            </button>
          )}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[14px] text-[#828282]">{label}</span>
      <span className="text-[14px] font-medium text-right">{value}</span>
    </div>
  );
}
