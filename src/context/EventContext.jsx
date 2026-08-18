import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { sellers } from "../data/mockData";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { createEvent as createEventApi, deleteEvent as deleteEventApi, getEvents as getEventsApi, updateEvent as updateEventApi, DEFAULT_EVENT_IMAGE } from "../lib/api/events";
import { refreshUserReputation } from "../lib/api/reputation";

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

function localEvents(events) {
  return (events ?? []).map((event) => ({
    ...event,
    diagnostics: event.diagnostics ?? { source: "local fallback", event_source: "local fallback" },
  }));
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
  const [events, setEvents] = useState(() => localEvents(readEvents(storageKey)));
  const [attendees, setAttendees] = useState(() => readAttendees(currentUserId));

  useEffect(() => {
    let cancelled = false;
    const cachedEvents = localEvents(readEvents(storageKey));
    setEvents(cachedEvents);

    async function loadEvents() {
      if (!isSupabaseConfigured) {
        console.info("event source: local fallback", { operation: "loadEvents", reason: "Supabase is not configured" });
        return;
      }
      try {
        const remoteEvents = await getEventsApi();
        if (!remoteEvents) return;
        const remoteIds = new Set(remoteEvents.map((event) => event.id));
        const cachedOnly = cachedEvents.filter((event) => !remoteIds.has(event.id));
        const migrated = user?.id && cachedOnly.length
          ? (await Promise.all(cachedOnly.map((event) => createEventApi(event).catch((error) => {
            console.warn("event source: local fallback", { operation: "migrateEvent", eventId: event.id, error: error?.message ?? String(error) });
            return null;
          })))).filter(Boolean)
          : [];
        const resolvedEvents = [...migrated, ...remoteEvents];
        if (!cancelled) {
          setEvents(resolvedEvents);
          persistEvents(storageKey, resolvedEvents);
        }
      } catch (error) {
        console.warn("event source: local fallback", { operation: "loadEvents", error: error?.message ?? String(error) });
      }
    }

    loadEvents();
    return () => { cancelled = true; };
  }, [storageKey, user?.id]);

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

  const toggleAttendance = useCallback(async (eventId) => {
    const event = events.find((item) => item.id === eventId || item.databaseId === eventId);
    const persistedEventId = event?.databaseId ?? eventId;
    let removing = false;

    setAttendees((current) => {
      const existing = new Set(current[eventId] ?? []);
      removing = existing.has(currentUserId);
      if (removing) existing.delete(currentUserId);
      else existing.add(currentUserId);

      const next = { ...current, [eventId]: [...existing] };
      persistAttendees(next);
      return next;
    });

    if (!isSupabaseConfigured || !user?.id) {
      console.info("event attendance source: local fallback", { eventId, reason: "Supabase or authenticated user unavailable" });
      return;
    }

    const request = removing
      ? supabase.from("event_attendees").delete().eq("event_id", persistedEventId).eq("user_id", user.id)
      : supabase.from("event_attendees").insert({ event_id: persistedEventId, user_id: user.id });
    const { error } = await request;
    if (error) {
      setAttendees((current) => {
        const existing = new Set(current[eventId] ?? []);
        if (removing) existing.add(currentUserId);
        else existing.delete(currentUserId);
        const next = { ...current, [eventId]: [...existing] };
        persistAttendees(next);
        return next;
      });
      console.error("Unable to persist event attendance", {
        eventId,
        persistedEventId,
        removing,
        error: error?.message ?? String(error),
      });
      throw error;
    }

    if (!removing) {
      void refreshUserReputation(user?.id ?? currentUserId, { eventKey: `event-attendance:${persistedEventId}:${user?.id ?? currentUserId}` });
    }
  }, [currentUserId, events, user?.id]);

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

  const addEvent = useCallback(async (event) => {
    const optimisticEvent = {
      likes: 0,
      comments: 0,
      reposts: 0,
      shares: 0,
      ...event,
      id: `event-${Date.now()}`,
      createdAt: event.createdAt ?? Date.now(),
      sellerId: user?.id ?? STORE_ID,
      image: event.image || DEFAULT_EVENT_IMAGE,
      diagnostics: { source: "local fallback", event_source: "local fallback" },
    };
    setEvents((prev) => {
      const next = [optimisticEvent, ...prev];
      persistEvents(storageKey, next);
      return next;
    });
    if (!isSupabaseConfigured || !user?.id) {
      console.info("event source: local fallback", { operation: "createEvent", reason: "Supabase or authenticated owner unavailable" });
      return optimisticEvent;
    }

    try {
      const created = await createEventApi(optimisticEvent);
      if (!created) throw new Error("Event was not saved to Supabase.");
      setEvents((current) => {
        const next = current.map((item) => item.id === optimisticEvent.id ? created : item);
        persistEvents(storageKey, next);
        return next;
      });
      return created;
    } catch (error) {
      setEvents((current) => {
        const next = current.filter((item) => item.id !== optimisticEvent.id);
        persistEvents(storageKey, next);
        return next;
      });
      console.error("Unable to save event", {
        eventId: optimisticEvent.id,
        sellerId: optimisticEvent.sellerId,
        error: error?.message ?? String(error),
      });
      throw error;
    }
  }, [storageKey, user?.id]);

  const updateEvent = useCallback((eventId, updates) => {
    const nextUpdates = { ...updates, image: updates.image || DEFAULT_EVENT_IMAGE };
    setEvents((current) => {
      const next = current.map((event) => event.id === eventId ? { ...event, ...nextUpdates } : event);
      persistEvents(storageKey, next);
      return next;
    });
    if (isSupabaseConfigured && user?.id) {
      updateEventApi(eventId, nextUpdates).then((updated) => {
        if (!updated) return;
        setEvents((current) => {
          const next = current.map((item) => item.id === eventId ? updated : item);
          persistEvents(storageKey, next);
          return next;
        });
      }).catch((error) => console.warn("event source: local fallback", { operation: "updateEvent", error: error?.message ?? String(error) }));
    } else {
      console.info("event source: local fallback", { operation: "updateEvent", reason: "Supabase or authenticated owner unavailable" });
    }
  }, [storageKey, user?.id]);

  const removeEvent = useCallback((eventId) => {
    setEvents((current) => {
      const next = current.filter((event) => event.id !== eventId);
      persistEvents(storageKey, next);
      return next;
    });
    if (isSupabaseConfigured && user?.id) {
      deleteEventApi(eventId).catch((error) => console.warn("event source: local fallback", { operation: "deleteEvent", error: error?.message ?? String(error) }));
    } else {
      console.info("event source: local fallback", { operation: "deleteEvent", reason: "Supabase or authenticated owner unavailable" });
    }
  }, [storageKey, user?.id]);

  const eventSeller = useCallback((event) => event.seller ?? sellers[event.sellerId], []);

  const value = {
    events,
    upcomingEvents,
    pastEvents,
    getEvent,
    addEvent,
    updateEvent,
    removeEvent,
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
