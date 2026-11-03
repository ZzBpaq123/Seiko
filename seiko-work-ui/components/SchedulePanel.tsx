"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearHash, usePanelOpen } from "@/hooks/useHash";
import { useLatestRequest } from "@/hooks/useLatestRequest";
import { buildCalendarIndex } from "@/lib/calendarIndex";
import { PanelReveal } from "@/components/PanelReveal";
import { DateTimeRangePicker, type DateTimeRange } from "@/components/DateTimeRangePicker";
import {
  createEvent,
  deleteEvent,
  listEventsByRange,
  updateEvent,
  type CalendarEvent,
  type CalendarEventParams,
} from "@/lib/event";
import { fetchHolidays, type HolidayInfo } from "@/lib/holiday";
import { toast } from "@/lib/toast";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const MAX_BARS = 3;

// 8 个高区分度颜色，按 event.id 自动分配
const EVENT_COLORS = [
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

function eventColor(id: number) {
  return EVENT_COLORS[Math.abs(id) % EVENT_COLORS.length];
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 后端返回 "yyyy-MM-dd HH:mm:ss"，手动解析避免时区偏移
function parseDateTime(s: string) {
  const [datePart, timePart] = s.split(" ");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh = 0, mm = 0, ss = 0] = (timePart ?? "").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, ss);
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function eventDates(e: CalendarEvent) {
  return { start: fmtDate(parseDateTime(e.startTime)), end: fmtDate(parseDateTime(e.endTime)) };
}

function rangeText(e: CalendarEvent) {
  const { start, end } = eventDates(e);
  const trim = (s: string) => s.slice(5).replace("-", "/");
  const base = start === end ? start : `${trim(start)} ~ ${trim(end)}`;
  if (e.isAllDay === 1) return `${base} 全天`;
  const t = (s: string) => s.slice(11, 16);
  return `${base} ${t(e.startTime)} ~ ${t(e.endTime)}`;
}

function failMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

type EditorState =
  | { mode: "create"; startDate?: string }
  | { mode: "edit"; event: CalendarEvent };

function SchedulePanelContent() {
  const today = useMemo(() => fmtDate(new Date()), []);
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Record<string, HolidayInfo>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const open = usePanelOpen("#schedule");

  const gridStart = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const offset = (first.getDay() + 6) % 7; // 周一起始
    return addDays(first, -offset);
  }, [view]);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const gridEnd = days[41];

  const eventRequest = useLatestRequest();
  const load = useCallback(async () => {
    const request = eventRequest.start();
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listEventsByRange(fmtDate(gridStart), fmtDate(gridEnd), request.signal);
      if (!request.isCurrent()) return;
      setEvents(list);
    } catch (err) {
      if (!request.isCurrent()) return;
      setLoadError(failMessage(err, "加载日程失败"));
      setEvents([]);
    } finally {
      if (request.isCurrent()) setLoading(false);
    }
  }, [gridStart, gridEnd, eventRequest]);

  useEffect(() => {
    if (!open) return;
    load();
    return () => eventRequest.cancel();
  }, [open, load, eventRequest]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const years = new Set([gridStart.getFullYear(), gridEnd.getFullYear()]);
    Promise.all([...years].map(fetchHolidays)).then((results) => {
      if (cancelled) return;
      setHolidays(Object.assign({}, ...results));
    });
    return () => {
      cancelled = true;
    };
  }, [open, gridStart, gridEnd]);


  const goMonth = (n: number) => {
    const d = new Date(view.year, view.month + n, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const calendar = useMemo(
    () => buildCalendarIndex(events, days.map(fmtDate), MAX_BARS),
    [events, days]
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id),
    [events]
  );

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedEvents;
    return sortedEvents.filter((e) =>
      [e.title, e.content, e.location].some((s) => s?.toLowerCase().includes(q))
    );
  }, [sortedEvents, query]);

  const handleDelete = async (e: CalendarEvent) => {
    try {
      await deleteEvent(e.id);
      toast.success("日程已删除");
      setDetail(null);
      load();
    } catch (err) {
      toast.error(failMessage(err, "删除日程失败"));
    }
  };

  const handleSubmit = async (params: CalendarEventParams) => {
    setSaving(true);
    try {
      if (editor?.mode === "edit") {
        await updateEvent(editor.event.id, params);
        toast.success("日程已更新");
      } else {
        await createEvent(params);
        toast.success("日程已创建");
      }
      setEditor(null);
      setDetail(null);
      load();
    } catch (err) {
      toast.error(failMessage(err, "保存日程失败"));
    } finally {
      setSaving(false);
    }
  };

  const calendarCells = useMemo(() => (
    days.map((day) => {
      const dateStr = fmtDate(day);
      const inMonth = day.getMonth() === view.month;
      const holiday = holidays[dateStr];
      const dayEntry = calendar.get(dateStr);
      const dayLanes = dayEntry?.slots;
      const dayCount = dayEntry?.count ?? 0;
      return (
        <div
          key={dateStr}
          className={cn(
            "flex min-h-20 flex-col border-b border-r border-neutral-900/5 dark:border-white/5 p-1.5",
            !inMonth && "opacity-35"
          )}
        >
          <div className="flex items-start">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                dateStr === today
                  ? "bg-neutral-900 dark:bg-neutral-50 font-semibold text-neutral-50 dark:text-neutral-900"
                  : holiday?.isHoliday === 1
                    ? "font-medium text-red-600"
                    : "font-semibold text-neutral-900 dark:text-neutral-100"
              )}
            >
              {day.getDate()}
            </span>
          </div>
          {/* 固定高度槽位，保证有无节假日的格子横线对齐 */}
          <div className="mt-0.5 h-6 overflow-hidden">
            {holiday && (
              <span
                className={cn(
                  "block break-all text-right text-[10px] leading-3",
                  holiday.isHoliday === 1 ? "text-red-600" : "text-neutral-600 dark:text-neutral-300"
                )}
              >
                {holiday.name}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-1 flex-col gap-0.5">
            {Array.from({ length: MAX_BARS }, (_, lane) => {
              const slot = dayLanes?.[lane];
              if (!slot) return <div key={`lane-${lane}`} className="h-1.5" />;
              const { event: e, start, end } = slot;
              return (
                <button
                  key={`lane-${lane}`}
                  onClick={() => setDetail(e)}
                  title={e.title}
                  className={cn(
                    "h-1.5 w-[calc(100%+0.75rem)] cursor-pointer transition-opacity hover:opacity-70",
                    // 负边距出血到格子边缘，使相邻格的横条无缝衔接
                    "-mx-1.5",
                    dateStr === start && "rounded-l-full",
                    dateStr === end && "rounded-r-full"
                  )}
                  style={{ backgroundColor: eventColor(e.id) }}
                />
              );
            })}
            {dayCount > MAX_BARS && (
              <span className="block text-[10px] leading-3 text-neutral-500 dark:text-neutral-400">
                +{dayCount - MAX_BARS}
              </span>
            )}
          </div>
        </div>
      );
    })
  ), [days, view.month, holidays, calendar, today]);

  return (
    <PanelReveal open={open}>
      <div className="pointer-events-auto fixed bottom-6 left-6 right-24 top-24 z-10 flex gap-4">
        {/* 左：月历 */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <button
              onClick={() => goMonth(-1)}
              aria-label="上个月"
              className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-28 text-center text-sm font-semibold">
              {view.year}年{view.month + 1}月
            </span>
            <button
              onClick={() => goMonth(1)}
              aria-label="下个月"
              className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setView({ year: now.getFullYear(), month: now.getMonth() });
              }}
              className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
            >
              今天
            </button>
          </div>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 border-b border-neutral-900/10 dark:border-white/10">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400"
            >
              {w}
            </div>
          ))}
        </div>

        {/* 月历网格 */}
        <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto overflow-x-hidden">
          {loading && events.length === 0 ? (
            <div className="col-span-7 flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载日程…
            </div>
          ) : loadError ? (
            <div className="col-span-7 flex flex-col items-center gap-3 py-16 text-sm text-neutral-500 dark:text-neutral-400">
              <p className="max-w-55 text-center text-xs leading-5">{loadError}</p>
              <button
                onClick={load}
                className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                重试
              </button>
            </div>
          ) : (
            calendarCells
          )}
        </div>
      </div>

      {/* 右侧日程列表 */}
      <aside className="hidden w-96 shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm xl:flex">
        <div className="flex items-center justify-between border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            日程列表
            {visibleEvents.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {visibleEvents.length} 条
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditor({ mode: "create" })}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-50 dark:text-neutral-900 transition-colors hover:bg-neutral-700 dark:hover:bg-neutral-300"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              添加日程
            </button>
            <button
              onClick={load}
              disabled={loading}
              aria-label="刷新"
              className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50 disabled:opacity-50"
            >
              <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
        <div className="border-b border-neutral-900/10 dark:border-white/10 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、内容或地点"
              className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 py-2 pl-9 pr-8 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="清空搜索"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 dark:text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading && events.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在加载…
            </div>
          ) : visibleEvents.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-400 dark:text-neutral-500">
              {query ? "没有匹配的日程" : "当前月份暂无日程"}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900/5">
              {visibleEvents.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setDetail(e)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: eventColor(e.id) }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {e.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">{rangeText(e)}</span>
                      {e.content && (
                        <span className="mt-0.5 block truncate text-xs text-neutral-400 dark:text-neutral-500">
                          {e.content}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      </div>

      {/* 日程详情弹窗 */}
      {detail && (
        <div
          className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center"
          onClick={() => setDetail(null)}
        >
          <div className="absolute inset-0 bg-neutral-900/20 dark:bg-black/60" />
          <div
            className="relative w-80 rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/95 dark:bg-neutral-900 p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: eventColor(detail.id) }}
                />
                {detail.title}
              </h3>
              <button
                onClick={() => setDetail(null)}
                aria-label="关闭"
                className="rounded-full p-1 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{rangeText(detail)}</p>
            {detail.location && (
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">地点：{detail.location}</p>
            )}
            {detail.content && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-500 dark:text-neutral-400">
                {detail.content}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditor({ mode: "edit", event: detail });
                  setDetail(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                <PenLine className="h-3.5 w-3.5" />
                修改
              </button>
              <button
                onClick={() => handleDelete(detail)}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition-colors hover:border-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加/修改弹窗 */}
      {editor && (
        <EventEditor
          state={editor}
          saving={saving}
          onCancel={() => setEditor(null)}
          onSubmit={handleSubmit}
        />
      )}
    </PanelReveal>
  );
}

function EventEditor({
  state,
  saving,
  onCancel,
  onSubmit,
}: {
  state: EditorState;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (params: CalendarEventParams) => void;
}) {
  const initial =
    state.mode === "edit" ? eventDates(state.event) : { start: state.startDate ?? "", end: "" };
  const [title, setTitle] = useState(state.mode === "edit" ? state.event.title : "");
  const [range, setRange] = useState<DateTimeRange>({
    startDate: initial.start,
    endDate: initial.end,
    isAllDay: state.mode === "edit" ? state.event.isAllDay === 1 : true,
    startTime: state.mode === "edit" ? state.event.startTime.slice(11, 16) : "09:00",
    endTime: state.mode === "edit" ? state.event.endTime.slice(11, 16) : "10:00",
  });
  const [location, setLocation] = useState(
    state.mode === "edit" ? (state.event.location ?? "") : ""
  );
  const [content, setContent] = useState(state.mode === "edit" ? (state.event.content ?? "") : "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!content.trim()) {
      setError("内容不能为空");
      return;
    }
    if (!range.startDate || !range.endDate) {
      setError("请选择开始和结束日期");
      return;
    }
    const { startDate, endDate, isAllDay, startTime, endTime } = range;
    const startAt = `${startDate} ${isAllDay ? "00:00" : startTime}`;
    const endAt = `${endDate} ${isAllDay ? "23:59" : endTime}`;
    if (endAt < startAt) {
      setError("结束时间不能早于开始时间");
      return;
    }
    setError(null);
    onSubmit({ title: title.trim(), ...range, location, content: content.trim() });
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-neutral-900/20 dark:bg-black/60" />
      <div
        className="relative w-96 rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/95 dark:bg-neutral-900 p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {state.mode === "edit" ? "修改日程" : "添加日程"}
          </h3>
          <button
            onClick={onCancel}
            aria-label="关闭"
            className="rounded-full p-1 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="日程标题"
            autoFocus
            className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
          />
          <DateTimeRangePicker value={range} onChange={setRange} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="内容"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="地点（可选）"
            className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-50 dark:text-neutral-900 transition-colors hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {state.mode === "edit" ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const SchedulePanel = memo(SchedulePanelContent);
