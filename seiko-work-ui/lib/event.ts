import { request } from "@/lib/axios";

export interface CalendarEvent {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: number;
  location: string | null;
  content: string | null;
}

export interface CalendarEventParams {
  title: string;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  isAllDay: boolean;
  startTime?: string; // HH:mm，非全天时必填
  endTime?: string; // HH:mm，非全天时必填
  location?: string;
  content: string;
}

function toBody(params: CalendarEventParams) {
  const allDay = params.isAllDay;
  return {
    title: params.title,
    startTime: toDateTime(
      params.startDate,
      allDay ? "00:00:00" : `${params.startTime ?? "09:00"}:00`
    ),
    endTime: toDateTime(
      params.endDate,
      allDay ? "23:59:59" : `${params.endTime ?? "10:00"}:00`
    ),
    isAllDay: allDay ? 1 : 0,
    location: params.location?.trim() || null,
    content: params.content.trim(),
  };
}

function toDateTime(date: string, time: string) {
  return `${date} ${time}`;
}

export function listEventsByRange(start: string, end: string, signal?: AbortSignal) {
  return request<CalendarEvent[]>({
    method: "GET",
    url: "/api/events/range",
    signal,
    params: { start: toDateTime(start, "00:00:00"), end: toDateTime(end, "23:59:59") },
  });
}

export function createEvent(params: CalendarEventParams) {
  return request<void>({
    method: "POST",
    url: "/api/events",
    data: toBody(params),
  });
}

export function updateEvent(id: number, params: CalendarEventParams) {
  return request<void>({
    method: "PUT",
    url: `/api/events/${id}`,
    data: toBody(params),
  });
}

export function deleteEvent(id: number) {
  return request<void>({ method: "DELETE", url: `/api/events/${id}` });
}
