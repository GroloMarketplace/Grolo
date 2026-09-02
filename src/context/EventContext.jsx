import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sellers } from "../data/mockData";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { createEvent as createEventApi, createEventAttendanceConfirmationNotifications, deleteEvent as deleteEventApi, getEvents as getEventsApi, respondToEventAttendanceConfirmation, updateEvent as updateEventApi, DEFAULT_EVENT_IMAGE } from "../lib/api/events";
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

function eventAttendanceKeys(eventId, events) {
  const event = events.find((item) => item.id === eventId || item.databaseId === eventId);
  return [...new Set([eventId, event?.id, event?.databaseId].filter(Boolean))];
}

function groupAttendees(rows, events) {
  return rows.reduce((result, row) => {
    const keys = eventAttendanceKeys(row.event_id, events);
    keys.forEach((key) => {
      const current = result[key] ?? [];
      result[key] = current.includes(row.user_id) ? current : [...current, row.user_id];
    });
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
  const eventEnd = new Date(`${event.date}T${event.endTime || event.startTime || "23:59:59"}`);
  if (!Number.isNaN(eventEnd.getTime()) && eventEnd.getTime() < Date.now()) return "Past";
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
  const [attendeeRows, setAttendeeRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const cachedEvents = localEvents(readEvents(storageKey));
    setEvents(cachedEvents);

    async function loadEvents() {
      if (!isSupabaseConfigured) {
        return;
      }
      try {
        const remoteEvents = await getEventsApi();
        if (!remoteEvents) return;
        const remoteIds = new Set(remoteEvents.map((event) => event.id));
        const cachedOnly = cachedEvents.filter((event) => !remoteIds.has(event.id));
        const migrated = user?.id && cachedOnly.length
          ? (await Promise.all(cachedOnly.map((event) => createEventApi(event).catch((error) => {
            return null;
          })))).filter(Boolean)
          : [];
        const resolvedEvents = [...migrated, ...remoteEvents];
        if (!cancelled) {
          setEvents((current) => {
            const remoteKeys = new Set(remoteEvents.flatMap((event) => [event.id, event.databaseId].filter(Boolean)));
            const pendingEvents = current.filter((event) => !remoteKeys.has(event.id) && !remoteKeys.has(event.databaseId));
            const merged = [...pendingEvents, ...resolvedEvents].filter((event, index, allEvents) => {
              const key = event.databaseId ?? event.id;
              return allEvents.findIndex((candidate) => (candidate.databaseId ?? candidate.id) === key) === index;
            });
            persistEvents(storageKey, merged);
            return merged;
          });
        }
      } catch (error) {
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
        .select("event_id, user_id, attendance_status");
      if (!error && !cancelled) {
        const rows = data ?? [];
        setAttendeeRows(rows);
      } else if (error) {
        console.error("Unable to load event attendance", {
          currentUserId,
          error: error?.message ?? String(error),
        });
      }
    }

    loadAttendees();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    createEventAttendanceConfirmationNotifications().catch((error) => {});
  }, [user?.id]);

  useEffect(() => {
    const next = groupAttendees(attendeeRows, events);
    setAttendees(next);
    persistAttendees(next);
  }, [attendeeRows, events]);

  const isAttending = useCallback((eventId) => {
    const keys = eventAttendanceKeys(eventId, events);
    return keys.some((key) => (attendees[key] ?? []).includes(currentUserId))
      && !attendeeRows.some((row) => keys.includes(row.event_id) && row.user_id === currentUserId && row.attendance_status === "no_show");
  }, [attendeeRows, attendees, currentUserId, events]);

  const getAttendeeCount = useCallback((eventId) => {
    const keys = eventAttendanceKeys(eventId, events);
    const attendeeIds = new Set(keys.flatMap((key) => attendees[key] ?? []));
    return attendeeIds.size;
  }, [attendees, currentUserId, events]);

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

  const confirmAttendance = useCallback(async (eventId, attended) => {
    const event = events.find((item) => item.id === eventId || item.databaseId === eventId);
    const eventKeys = eventAttendanceKeys(eventId, events);
    const persistedEventId = event?.databaseId ?? eventId;
    const status = await respondToEventAttendanceConfirmation(persistedEventId, attended);
    if (status) {
      setAttendeeRows((current) => current.map((row) => (
        eventKeys.includes(row.event_id) && row.user_id === currentUserId
          ? { ...row, attendance_status: status }
          : row
      )));
    }
    return status;
  }, [currentUserId, events]);

  const confirmedEventIds = useMemo(() => [...new Set(attendeeRows
    .filter((row) => row.user_id === currentUserId && row.attendance_status === "confirmed_attended")
    .flatMap((row) => eventAttendanceKeys(row.event_id, events)))], [attendeeRows, currentUserId, events]);

  const upcomingEvents = useCallback(
    (sellerId) =>
      events
        .filter((e) => eventStatus(e) !== "Past")
        .filter((e) => !sellerId || String(e.sellerId) === String(sellerId))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  const pastEvents = useCallback(
    (sellerId) =>
      events
        .filter((e) => eventStatus(e) === "Past")
        .filter((e) => !sellerId || String(e.sellerId) === String(sellerId))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );

  const getEvent = useCallback(
    (eventId) => events.find((e) => e.id === eventId || e.databaseId === eventId),
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
      }).catch((error) => {});
    } else {
    }
  }, [storageKey, user?.id]);

  const removeEvent = useCallback((eventId) => {
    setEvents((current) => {
      const next = current.filter((event) => event.id !== eventId);
      persistEvents(storageKey, next);
      return next;
    });
    if (isSupabaseConfigured && user?.id) {
      deleteEventApi(eventId).catch((error) => {});
    } else {
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
    attendingEventIds: confirmedEventIds,
    attendanceRows: attendeeRows,
    toggleAttendance,
    confirmAttendance,
    storeId: currentUserId,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error("useEvents must be used within an EventProvider");
  return ctx;
}
