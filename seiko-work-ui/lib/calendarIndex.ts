import type { CalendarEvent } from "./event";

export type CalendarSlot = { event: CalendarEvent; start: string; end: string };

/** Preserve API-order lane allocation and date/id display ordering. */
export function buildCalendarIndex(events: CalendarEvent[], dates: string[], maxBars: number) {
  const laneEnds: string[] = [];
  const byDay = new Map<string, { slots: (CalendarSlot | undefined)[]; count: number }>(
    dates.map(date => [date, { slots: [], count: 0 }])
  );
  const indexed = events.map(event => {
    const start = event.startTime.slice(0, 10);
    const end = event.endTime.slice(0, 10);
    let lane = laneEnds.findIndex(lastEnd => lastEnd < start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else laneEnds[lane] = end;
    return { event, start, end, lane };
  });
  indexed.sort((a, b) => a.start.localeCompare(b.start) || a.event.id - b.event.id);
  for (const item of indexed) {
    let low = 0, high = dates.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (dates[mid] < item.start) low = mid + 1;
      else high = mid;
    }
    for (let i = low; i < dates.length && dates[i] <= item.end; i++) {
      const day = byDay.get(dates[i])!;
      day.count++;
      if (item.lane < maxBars && !day.slots[item.lane]) day.slots[item.lane] = item;
    }
  }
  return byDay;
}
