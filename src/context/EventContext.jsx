import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { sellers } from "../data/mockData";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const EventContext = createContext(null);

const STORE_ID = "current-user";
const RSVP_STORAGE_KEY = "grolo-event-attendees";
const EVENTS_STORAGE_KEY = "grolo-events";

function readEvents(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistEvents(storageKey, events) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(events));
  } catch {
  }
}

function readAttendees(currentUserId) {
  try {
    const saved = JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY));
    if (!saved) return {};
    if (Array.isArray(saved)) {
      return saved.reduce((result, eventId) => ({
        ...result,
        [eventId]: [currentUserId],
      }), {});
    }
    return Object.fromEntries(Object.entries(saved).map(([eventId, userIds]) => [
      eventId,
      [...new Set(Array.isArray(userIds) ? userIds : [])],
    ]));
  } catch {
    return {};
  }
}

function groupAttendees(rows) {
  return rows.reduce((result, row) => {
    const current = result[row.event_id] ?? [];
    result[row.event_id] = current.includes(row.user_id) ? current : [...current, row.user_id];
    return result;
  }, {});
}

function persistAttendees(attendees) {
  try {
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(attendees));
  } catch {
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
  const { user } = useAuth();
  const currentUserId = user?.id ?? "current-user";
  const storageKey = `${EVENTS_STORAGE_KEY}-${currentUserId}`;
  const [events, setEvents] = useState(() => readEvents(storageKey) ?? []);
  const [attendees, setAttendees] = useState(() => readAttendees(currentUserId));

  useEffect(() => {
    setEvents(readEvents(storageKey) ?? []);
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendees() {
      if (!isSupabaseConfigured) return;
      const { data, error } = await supabase
        .from("event_attendees")
        .select("event_id, user_id");
      if (!error && !cancelled) {
        const next = groupAttendees(data ?? []);
        setAttendees(next);
        persistAttendees(next);
      }
    }

    loadAttendees();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isAttending = useCallback((eventId) => (
    (attendees[eventId] ?? []).includes(currentUserId)
  ), [attendees, currentUserId]);

  const getAttendeeCount = useCallback((eventId) => (
    (attendees[eventId] ?? []).length
  ), [attendees]);

  const toggleAttendance = useCallback((eventId) => {
    setAttendees((current) => {
      const existing = new Set(current[eventId] ?? []);
      const removing = existing.has(currentUserId);
      if (removing) existing.delete(currentUserId);
      else existing.add(currentUserId);

      const next = { ...current, [eventId]: [...existing] };
      persistAttendees(next);

      if (isSupabaseConfigured && user?.id) {
        const request = removing
          ? supabase.from("event_attendees").delete().eq("event_id", eventId).eq("user_id", user.id)
          : supabase.from("event_attendees").insert({ event_id: eventId, user_id: user.id });
        request.then(({ error }) => {
          if (error) console.error("Unable to persist event attendance", error);
        });
      }

      return next;
    });
  }, [currentUserId, user?.id]);

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
    setEvents((prev) => {
      const next = [
        {
          likes: 0,
          comments: 0,
          reposts: 0,
          shares: 0,
          ...event,
          id: `event-${Date.now()}`,
          createdAt: event.createdAt ?? Date.now(),
          sellerId: STORE_ID,
          image:
            event.image ||
            "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80",
        },
        ...prev,
      ];
      persistEvents(storageKey, next);
      return next;
    });
  }, [storageKey]);

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
    attendingEventIds: attendees[currentUserId] ?? [],
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
