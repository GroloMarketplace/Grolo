import { createContext, useCallback, useContext, useState } from "react";
import { events as mockEvents, sellers } from "../data/mockData";

const EventContext = createContext(null);

const STORE_ID = "sarahs-backyard";
const RSVP_STORAGE_KEY = "grolo-event-rsvps";

function readRsvps() {
  try {
    return JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function eventStatus(event) {
  if (event.date === today()) return "Today";
  return event.date > today() ? "Upcoming" : "Past";
}

export function formatEventDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatEventTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function EventProvider({ children }) {
  const [events, setEvents] = useState(() => mockEvents.map((event, index) => ({
    ...event,
    createdAt: event.createdAt ?? new Date(0).getTime() + (mockEvents.length - index),
  })));
  const [rsvpEventIds, setRsvpEventIds] = useState(() => readRsvps());

  const isAttending = useCallback((eventId) => rsvpEventIds.includes(eventId), [rsvpEventIds]);
  const getAttendeeCount = useCallback((eventId) => {
    const event = events.find((current) => current.id === eventId);
    return (event?.attendeeCount ?? 0) + (isAttending(eventId) ? 1 : 0);
  }, [events, isAttending]);
  const toggleAttendance = useCallback((eventId) => {
    setRsvpEventIds((current) => {
      const next = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const upcomingEvents = useCallback(
    (sellerId) =>
      events
        .filter((e) => eventStatus(e) !== "Past")
        .filter((e) => !sellerId || e.sellerId === sellerId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const pastEvents = useCallback(
    (sellerId) =>
      events
        .filter((e) => eventStatus(e) === "Past")
        .filter((e) => !sellerId || e.sellerId === sellerId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );

  const getEvent = useCallback(
    (eventId) => events.find((e) => e.id === eventId),
    [events],
  );

  const addEvent = useCallback((event) => {
    setEvents((prev) => [
      {
        likes: 0,
        comments: 0,
        reposts: 0,
        shares: 0,
        attendeeCount: 0,
        ...event,
        id: `event-${Date.now()}`,
        createdAt: event.createdAt ?? Date.now(),
        sellerId: STORE_ID,
        image:
          event.image ||
          "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
      },
      ...prev,
    ]);
  }, []);

  const eventSeller = useCallback((event) => sellers[event.sellerId], []);

  const value = {
    events,
    upcomingEvents,
    pastEvents,
    getEvent,
    addEvent,
    eventSeller,
    isAttending,
    getAttendeeCount,
    attendingEventIds: rsvpEventIds,
    toggleAttendance,
    storeId: STORE_ID,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvents must be used within an EventProvider");
  return ctx;
}
