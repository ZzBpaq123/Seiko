"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
  PiggyBank,
  Plus,
  Receipt,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, fmtAmount, fmtDate, parseDate } from "@/lib/date";
import { clearHash, usePanelOpen } from "@/hooks/useHash";
import { useLatestRequest } from "@/hooks/useLatestRequest";
import { PanelReveal } from "@/components/PanelReveal";
import { SavingsGoalDialog } from "@/components/SavingsGoalDialog";
import {
  createBill,
  deleteBill,
  getBillCategoryStat,
  getBillSummary,
  getBillTrend,
  listBills,
  updateBill,
  type BillCategoryStat,
  type BillParams,
  type BillRecord,
  type BillSummary,
  type BillTrend,
  type BillType,
  type PaymentMethod,
  type StatPeriod,
} from "@/lib/bill";
import { toast } from "@/lib/toast";

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: "DAY", label: "日" },
  { value: "WEEK", label: "周" },
  { value: "MONTH", label: "月" },
  { value: "YEAR", label: "年" },
];

const PAYMENT_LABELS: Record<number, string> = {
  0: "其他",
  1: "现金",
  2: "微信",
  3: "支付宝",
  4: "储蓄卡",
  5: "信用卡",
};

const PAYMENT_OPTIONS: PaymentMethod[] = [0, 1, 2, 3, 4, 5];

// 后端 category 是自由文本，这里给一组常用项做快捷选择，仍可手动输入
const CATEGORY_PRESETS: Record<BillType, string[]> = {
  0: ["餐饮", "交通", "购物", "居住", "水电", "通讯", "娱乐", "医疗", "教育", "人情", "旅行", "其他"],
  1: ["工资", "奖金", "兼职", "理财", "其他"],
};

const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"];

const PAGE_SIZE = 20;

/** 一周的第一天（周一），与后端 ISO 周口径一致 */
function startOfWeek(d: Date) {
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

function periodRange(period: StatPeriod, anchor: Date) {
  switch (period) {
    case "DAY":
      return { start: anchor, end: anchor };
    case "WEEK": {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 6) };
    }
    case "MONTH": {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      return { start, end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) };
    }
    case "YEAR": {
      const start = new Date(anchor.getFullYear(), 0, 1);
      return { start, end: new Date(anchor.getFullYear(), 11, 31) };
    }
  }
}

/** 趋势图展示窗口：以当前周期为终点往前推一段，保证图上有足够的数据点 */
function trendWindow(period: StatPeriod, anchor: Date) {
  const { start, end } = periodRange(period, anchor);
  switch (period) {
    case "DAY":
      return { start: addDays(start, -29), end };
    case "WEEK":
      return { start: addDays(start, -7 * 11), end };
    case "MONTH":
      return { start: new Date(start.getFullYear(), start.getMonth() - 11, 1), end };
    case "YEAR":
      return { start: new Date(start.getFullYear() - 4, 0, 1), end };
  }
}

function shiftAnchor(period: StatPeriod, anchor: Date, delta: number) {
  switch (period) {
    case "DAY":
      return addDays(anchor, delta);
    case "WEEK":
      return addDays(anchor, delta * 7);
    // 落到当月 1 号，避免 10-31 加一个月溢出成 12-01
    case "MONTH":
      return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    case "YEAR":
      return new Date(anchor.getFullYear() + delta, anchor.getMonth(), 1);
  }
}

function rangeLabel(period: StatPeriod, start: Date, end: Date) {
  switch (period) {
    case "DAY":
      return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
    case "WEEK":
      return `${start.getMonth() + 1}月${start.getDate()}日 ~ ${end.getMonth() + 1}月${end.getDate()}日`;
    case "MONTH":
      return `${start.getFullYear()}年${start.getMonth() + 1}月`;
    case "YEAR":
      return `${start.getFullYear()}年`;
  }
}

function shortPeriodLabel(item: BillTrend, period: StatPeriod) {
  const d = parseDate(item.periodStart);
  switch (period) {
    case "DAY":
      return String(d.getDate());
    case "WEEK":
      return `${d.getMonth() + 1}/${d.getDate()}`;
    case "MONTH":
      return `${d.getMonth() + 1}月`;
    case "YEAR":
      return String(d.getFullYear());
  }
}

function dayLabel(dateStr: string) {
  const d = parseDate(dateStr);
  const base = `${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY_CN[d.getDay()]}`;
  const today = fmtDate(new Date());
  if (dateStr === today) return `今天 · ${base}`;
  if (dateStr === fmtDate(addDays(new Date(), -1))) return `昨天 · ${base}`;
  return base;
}

function failMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

type EditorState =
  | { mode: "create"; defaultDate: string }
  | { mode: "edit"; bill: BillRecord };

function BillPanelContent() {
  const [period, setPeriod] = useState<StatPeriod>("MONTH");
  const [anchor, setAnchor] = useState(() => new Date());

  const [summary, setSummary] = useState<BillSummary | null>(null);
  const [trend, setTrend] = useState<BillTrend[]>([]);
  const [categoryStat, setCategoryStat] = useState<BillCategoryStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listMoreLoading, setListMoreLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [detail, setDetail] = useState<BillRecord | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const open = usePanelOpen("#bill");

  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const trendRange = useMemo(() => trendWindow(period, anchor), [period, anchor]);
  const startDate = fmtDate(range.start);
  const endDate = fmtDate(range.end);

  const statsRequest = useLatestRequest();
  const listRequest = useLatestRequest();

  const loadStats = useCallback(async () => {
    const request = statsRequest.start();
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [s, t, c] = await Promise.all([
        getBillSummary(startDate, endDate, request.signal),
        getBillTrend(period, fmtDate(trendRange.start), fmtDate(trendRange.end), request.signal),
        getBillCategoryStat(startDate, endDate, request.signal),
      ]);
      if (!request.isCurrent()) return;
      setSummary(s);
      setTrend(t);
      setCategoryStat(c);
    } catch (err) {
      if (!request.isCurrent()) return;
      setStatsError(failMessage(err, "加载统计失败"));
      setSummary(null);
      setTrend([]);
      setCategoryStat([]);
    } finally {
      if (request.isCurrent()) setStatsLoading(false);
    }
  }, [period, startDate, endDate, trendRange, statsRequest]);

  const loadList = useCallback(
    async (targetPage: number) => {
      const request = listRequest.start();
      if (targetPage === 1) setListLoading(true);
      else setListMoreLoading(true);
      setListError(null);
      try {
        const res = await listBills({
          current: targetPage,
          size: PAGE_SIZE,
          startDate,
          endDate,
        }, request.signal);
        if (!request.isCurrent()) return;
        setBills((prev) => (targetPage === 1 ? res.records : [...prev, ...res.records]));
        setTotal(res.total);
        setPage(targetPage);
      } catch (err) {
        if (!request.isCurrent()) return;
        setListError(failMessage(err, "加载账单失败"));
        if (targetPage === 1) {
          setBills([]);
          setTotal(0);
        }
      } finally {
        if (request.isCurrent()) {
          setListLoading(false);
          setListMoreLoading(false);
        }
      }
    },
    [startDate, endDate, listRequest]
  );

  useEffect(() => {
    if (!open) return;
    loadStats();
    loadList(1);
    return () => { statsRequest.cancel(); listRequest.cancel(); };
  }, [open, loadStats, loadList, statsRequest, listRequest]);


  const reload = useCallback(() => {
    loadStats();
    loadList(1);
  }, [loadStats, loadList]);

  /** 新增账单的默认日期：今天在当前周期内就用今天，否则用周期最后一天 */
  const defaultBillDate = useMemo(() => {
    const today = fmtDate(new Date());
    return today >= startDate && today <= endDate ? today : endDate;
  }, [startDate, endDate]);

  // 按日期分组展示，还原「每天花了多少」的记账视角
  const groups = useMemo(() => {
    const map = new Map<string, BillRecord[]>();
    for (const bill of bills) {
      const list = map.get(bill.billDate);
      if (list) list.push(bill);
      else map.set(bill.billDate, [bill]);
    }
    return [...map.entries()];
  }, [bills]);

  const maxBarValue = useMemo(
    () => Math.max(1, ...trend.map((t) => Math.max(t.expense, t.income))),
    [trend]
  );
  const labelStep = Math.max(1, Math.ceil(trend.length / 12));
  const expenseCategories = useMemo(
    () => categoryStat.filter((c) => c.expense > 0),
    [categoryStat]
  );

  const handleDelete = async (bill: BillRecord) => {
    try {
      await deleteBill(bill.id);
      toast.success("账单已删除");
      setDetail(null);
      reload();
    } catch (err) {
      toast.error(failMessage(err, "删除账单失败"));
    }
  };

  const handleSubmit = async (params: BillParams) => {
    setSaving(true);
    try {
      if (editor?.mode === "edit") {
        await updateBill(editor.bill.id, params);
        toast.success("账单已更新");
      } else {
        await createBill(params);
        toast.success("已记一笔");
      }
      setEditor(null);
      setDetail(null);
      reload();
    } catch (err) {
      toast.error(failMessage(err, "保存账单失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelReveal open={open}>
      <div className="pointer-events-auto fixed bottom-6 left-6 right-24 top-24 z-10 flex gap-4">
        {/* 左：统计 */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
            <div className="flex items-center gap-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs transition-colors",
                    period === p.value
                      ? "bg-neutral-900 font-medium text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}
                aria-label="上一周期"
                className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {rangeLabel(period, range.start, range.end)}
              </span>
              <button
                onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}
                aria-label="下一周期"
                className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAnchor(new Date())}
                className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                今天
              </button>
              <button
                onClick={() => setGoalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                <PiggyBank className="h-3.5 w-3.5" />
                攒钱目标
              </button>
            </div>
          </div>

          {statsError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
              <p className="max-w-55 text-center text-xs leading-5">{statsError}</p>
              <button
                onClick={loadStats}
                className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                重试
              </button>
            </div>
          ) : statsLoading && !summary ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在统计…
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* 汇总卡片 */}
              <div className="grid grid-cols-2 gap-3 border-b border-neutral-900/10 dark:border-white/10 px-5 py-4 sm:grid-cols-4">
                <SummaryCard label="支出" value={`¥${fmtAmount(summary?.expense ?? 0)}`} strong />
                <SummaryCard label="收入" value={`¥${fmtAmount(summary?.income ?? 0)}`} />
                <SummaryCard
                  label="结余"
                  value={`¥${fmtAmount(summary?.balance ?? 0)}`}
                  negative={(summary?.balance ?? 0) < 0}
                />
                <SummaryCard label="笔数" value={`${summary?.billCount ?? 0} 笔`} />
              </div>

              {/* 趋势 */}
              <div className="border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    收支趋势
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-neutral-900 dark:bg-neutral-100" />
                      支出
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-neutral-900/25 dark:bg-white/25" />
                      收入
                    </span>
                  </div>
                </div>
                {trend.length === 0 ? (
                  <p className="py-12 text-center text-sm text-neutral-400 dark:text-neutral-500">
                    该区间暂无数据
                  </p>
                ) : (
                  <div className="mt-4 flex h-44 items-stretch gap-1">
                    {trend.map((item, i) => {
                      const expPct = (item.expense / maxBarValue) * 100;
                      const incPct = (item.income / maxBarValue) * 100;
                      return (
                        <div
                          key={item.periodLabel}
                          className="flex min-w-0 flex-1 flex-col"
                          title={`${item.periodStart} ~ ${item.periodEnd}\n支出 ¥${fmtAmount(item.expense)}\n收入 ¥${fmtAmount(item.income)}\n共 ${item.billCount} 笔`}
                        >
                          <div className="flex flex-1 items-end justify-center gap-[2px]">
                            <div
                              className="w-1/2 max-w-3 rounded-t-sm bg-neutral-900 transition-colors dark:bg-neutral-100"
                              style={{ height: `${expPct}%` }}
                            />
                            <div
                              className="w-1/2 max-w-3 rounded-t-sm bg-neutral-900/25 transition-colors dark:bg-white/25"
                              style={{ height: `${incPct}%` }}
                            />
                          </div>
                          <span className="mt-1.5 h-3 truncate text-center text-[10px] text-neutral-400 dark:text-neutral-500">
                            {i % labelStep === 0 ? shortPeriodLabel(item, period) : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 分类占比 */}
              <div className="px-5 py-4">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  支出分类
                </h3>
                {expenseCategories.length === 0 ? (
                  <p className="py-10 text-center text-sm text-neutral-400 dark:text-neutral-500">
                    该区间暂无支出
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {expenseCategories.map((item) => (
                      <li key={item.category}>
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="truncate text-neutral-700 dark:text-neutral-300">
                            {item.category}
                          </span>
                          <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                            ¥{fmtAmount(item.expense)} · {item.expensePercent}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-900/8 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
                            style={{ width: `${Math.min(100, item.expensePercent)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 右：明细 */}
        <aside className="flex w-96 shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
              <Receipt className="h-4 w-4" />
              <span className="text-sm font-semibold">账单明细</span>
              {!listLoading && !listError && (
                <span className="rounded-full bg-neutral-900/5 px-2 py-0.5 text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
                  {total} 笔
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditor({ mode: "create", defaultDate: defaultBillDate })}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-50 transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-300"
              >
                <Plus className="h-3.5 w-3.5" />
                记一笔
              </button>
              <button
                onClick={reload}
                disabled={listLoading}
                aria-label="刷新"
                className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50 disabled:opacity-50"
              >
                <RotateCw className={cn("h-4 w-4", listLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {listLoading && bills.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500 dark:text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载账单…
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-sm text-neutral-500 dark:text-neutral-400">
                <p className="max-w-55 text-center text-xs leading-5">{listError}</p>
                <button
                  onClick={() => loadList(1)}
                  className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
                >
                  重试
                </button>
              </div>
            ) : bills.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-neutral-400 dark:text-neutral-500">
                <Receipt className="h-6 w-6 text-neutral-300 dark:text-neutral-600" />
                <p>这段时间还没有账单</p>
              </div>
            ) : (
              <>
                {groups.map(([date, items]) => (
                  <div key={date}>
                    <div className="sticky top-0 z-1 flex items-center justify-between border-b border-neutral-900/5 bg-white/70 px-4 py-2 backdrop-blur-sm dark:border-white/5 dark:bg-neutral-900/60">
                      <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        {dayLabel(date)}
                      </span>
                      <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                        支出 ¥{fmtAmount(items.reduce((s, b) => s + (b.type === 0 ? b.amount : 0), 0))}
                      </span>
                    </div>
                    {items.map((bill) => (
                      <button
                        key={bill.id}
                        onClick={() => setDetail(bill)}
                        className="flex w-full items-center gap-3 border-b border-neutral-900/5 px-4 py-2.5 text-left transition-colors hover:bg-neutral-900/3 dark:border-white/5 dark:hover:bg-white/5"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900/10 text-xs text-neutral-700 dark:bg-white/10 dark:text-neutral-300">
                          {(bill.category || "未").slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                            {bill.category || "未分类"}
                          </span>
                          <span className="block truncate text-xs text-neutral-400 dark:text-neutral-500">
                            {bill.remark || PAYMENT_LABELS[bill.paymentMethod] || "其他"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-medium tabular-nums",
                            bill.type === 1
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-neutral-900 dark:text-neutral-100"
                          )}
                        >
                          {bill.type === 1 ? "+" : "-"}¥{fmtAmount(bill.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {bills.length < total && (
                  <div className="px-4 py-4">
                    <button
                      onClick={() => loadList(page + 1)}
                      disabled={listMoreLoading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 py-2 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white disabled:opacity-50"
                    >
                      {listMoreLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      加载更多（{bills.length}/{total}）
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {/* 账单详情 */}
      {detail && (
        <div
          className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center"
          onClick={() => setDetail(null)}
        >
          <div className="absolute inset-0 bg-neutral-900/20 dark:bg-black/60" />
          <div
            className="relative w-80 rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/95 p-5 shadow-lg dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {detail.category || "未分类"}
              </h3>
              <button
                onClick={() => setDetail(null)}
                aria-label="关闭"
                className="rounded-full p-1 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tabular-nums",
                detail.type === 1
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-900 dark:text-neutral-100"
              )}
            >
              {detail.type === 1 ? "+" : "-"}¥{fmtAmount(detail.amount)}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <DetailRow label="类型" value={detail.type === 1 ? "收入" : "支出"} />
              <DetailRow label="日期" value={detail.billDate} />
              <DetailRow label="支付方式" value={PAYMENT_LABELS[detail.paymentMethod] || "其他"} />
              {detail.remark && <DetailRow label="备注" value={detail.remark} />}
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditor({ mode: "edit", bill: detail });
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

      {/* 记一笔 / 修改 */}
      {editor && (
        <BillEditor
          state={editor}
          saving={saving}
          onCancel={() => setEditor(null)}
          onSubmit={handleSubmit}
        />
      )}

      {/* 攒钱目标 */}
      {goalOpen && <SavingsGoalDialog onClose={() => setGoalOpen(false)} />}
    </PanelReveal>
  );
}

function SummaryCard({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-900/10 bg-white/40 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-lg tabular-nums",
          negative
            ? "text-red-600 dark:text-red-400"
            : strong
              ? "font-semibold text-neutral-900 dark:text-neutral-100"
              : "text-neutral-700 dark:text-neutral-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-neutral-400 dark:text-neutral-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-neutral-700 dark:text-neutral-300">{value}</dd>
    </div>
  );
}

function BillEditor({
  state,
  saving,
  onCancel,
  onSubmit,
}: {
  state: EditorState;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (params: BillParams) => void;
}) {
  const [type, setType] = useState<BillType>(state.mode === "edit" ? state.bill.type : 0);
  const [amount, setAmount] = useState(state.mode === "edit" ? String(state.bill.amount) : "");
  const [category, setCategory] = useState(state.mode === "edit" ? (state.bill.category ?? "") : "");
  const [billDate, setBillDate] = useState(
    state.mode === "edit" ? state.bill.billDate : state.defaultDate
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    state.mode === "edit" ? state.bill.paymentMethod : 0
  );
  const [remark, setRemark] = useState(state.mode === "edit" ? (state.bill.remark ?? "") : "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError("请输入大于 0 的金额");
      return;
    }
    if (value > 9999999999.99) {
      setError("金额超出可记录范围");
      return;
    }
    if (!billDate) {
      setError("请选择账单日期");
      return;
    }
    setError(null);
    onSubmit({
      type,
      amount: Math.round(value * 100) / 100,
      category: category.trim() || null,
      billDate,
      paymentMethod,
      remark: remark.trim() || null,
    });
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-neutral-900/20 dark:bg-black/60" />
      <div
        className="relative w-96 rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/95 p-5 shadow-lg dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {state.mode === "edit" ? "修改账单" : "记一笔"}
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
          {/* 收支切换 */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 p-0.5">
            {([0, 1] as BillType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md py-1.5 text-xs transition-colors",
                  type === t
                    ? "bg-neutral-900 font-medium text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
                )}
              >
                {t === 0 ? "支出" : "收入"}
              </button>
            ))}
          </div>

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="金额（元）"
            autoFocus
            className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm tabular-nums text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
          />

          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="分类（可直接输入或点选下方标签）"
            className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
          />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_PRESETS[type].map((name) => (
              <button
                key={name}
                onClick={() => setCategory(name)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  category === name
                    ? "border-neutral-900 bg-neutral-900 text-neutral-50 dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                    : "border-neutral-900/15 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:border-white dark:hover:text-neutral-50"
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              type="date"
              className="min-w-0 flex-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-900 dark:focus:border-white"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(Number(e.target.value) as PaymentMethod)}
              className="min-w-0 flex-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-900 dark:focus:border-white"
            >
              {PAYMENT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="备注（可选）"
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
            {state.mode === "edit" ? "保存" : "记一笔"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const BillPanel = memo(BillPanelContent);
