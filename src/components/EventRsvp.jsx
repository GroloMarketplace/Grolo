import { useEvents } from "../context/EventContext";

export function EventAttendanceCount({ eventId, className = "" }) {
  const { getAttendeeCount } = useEvents();
  return <span className={`text-[12px] text-[#498467] ${className}`}>👥 {getAttendeeCount(eventId)} Attending</span>;
}

export default function EventRsvp({ eventId }) {
  const { getAttendeeCount, isAttending, toggleAttendance } = useEvents();
  const attending = isAttending(eventId);

  return (
    <section className="rounded-lg border border-[#E6E6E6] p-4">
      <div className="flex items-center gap-2 text-[16px] font-semibold">
        <span aria-hidden="true">👥</span>
        <span>Attending</span>
      </div>
      <p className="mt-2 text-[14px] text-[#4F4F4F]">{getAttendeeCount(eventId)} Attending</p>
      <button
        type="button"
        onClick={() => toggleAttendance(eventId)}
        className={`mt-3 w-full rounded-lg py-2.5 text-[14px] font-medium ${attending ? "border border-[#498467] bg-[#F5FFF6] text-[#498467]" : "bg-[#498467] text-white"}`}
      >
        {attending ? "✅ Attending" : "I'm Attending!"}
      </button>
    </section>
  );
}
