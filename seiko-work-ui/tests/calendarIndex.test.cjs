const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./loadTypeScript.cjs");
const { buildCalendarIndex } = load("lib/calendarIndex.ts");
const dates = Array.from({ length: 42 }, (_, i) => new Date(Date.UTC(2026, 9, 26 + i)).toISOString().slice(0, 10));
function previousAlgorithm(events) {
  const ends = [], lanes = new Map();
  for (const e of events) {
    const start = e.startTime.slice(0, 10), end = e.endTime.slice(0, 10);
    let lane = ends.findIndex(last => last < start);
    if (lane < 0) { lane = ends.length; ends.push(end); } else ends[lane] = end;
    lanes.set(e.id, lane);
  }
  return dates.map(date => {
    const day = events.filter(e => e.startTime.slice(0, 10) <= date && date <= e.endTime.slice(0, 10))
      .sort((a, b) => a.startTime.slice(0, 10).localeCompare(b.startTime.slice(0, 10)) || a.id - b.id);
    return { count: day.length, slots: Array.from({ length: 3 }, (_, lane) => day.find(e => lanes.get(e.id) === lane)?.id) };
  });
}
test("calendar indexing preserves all lanes, overflow counts and cross-month events", () => {
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let run = 0; run < 100; run++) {
    const events = Array.from({ length: 80 }, (_, id) => {
      const start = Math.floor(random() * 50) - 5, end = start + Math.floor(random() * 15);
      const date = offset => new Date(Date.UTC(2026, 9, 26 + offset)).toISOString().slice(0, 10);
      return { id, startTime: date(start) + " 09:00:00", endTime: date(end) + " 18:00:00" };
    });
    const originalOrder = events.map(e => e.id);
    const actual = buildCalendarIndex(events, dates, 3);
    assert.deepEqual(dates.map(date => ({ count: actual.get(date).count,
      slots: Array.from({ length: 3 }, (_, i) => actual.get(date).slots[i]?.event.id) })), previousAlgorithm(events));
    assert.deepEqual(events.map(e => e.id), originalOrder);
  }
});
test("empty calendar retains all 42 cells", () => {
  const index = buildCalendarIndex([], dates, 3); assert.equal(index.size, 42);
  for (const day of index.values()) { assert.equal(day.count, 0); assert.deepEqual(day.slots, []); }
});
