"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBillSummary } from "@/lib/bill";
import { fmtAmount, fmtDate } from "@/lib/date";
import {
  DEFAULT_BUCKETS,
  DEFAULT_GOAL_NAME,
  DEFAULT_SALARY_DAY,
  getSavingsGoal,
  parseSalaryDay,
  salaryCycleRange,
  saveSavingsGoal,
  type SavingsBucket,
} from "@/lib/savings";
import { toast } from "@/lib/toast";

/** 编辑期的档位草稿：percent 用字符串存，避免清空输入框时被强制变成 0 */
type BucketDraft = { name: string; percent: string; saving: boolean };

const MAX_BUCKETS = 10;

function toDraft(bucket: SavingsBucket): BucketDraft {
  return { name: bucket.name, percent: String(bucket.percent), saving: Boolean(bucket.saving) };
}

function parsePercent(raw: string) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** 发薪日草稿同样是字符串：空串 = 还没填（非法），失焦时会被补回默认的 1 号 */
function toSalaryDayDraft(day: number | null | undefined) {
  return day ? String(day) : "";
}

function fmtMonthDay(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function failMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export function SavingsGoalDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState(DEFAULT_GOAL_NAME);
  const [buckets, setBuckets] = useState<BucketDraft[]>(() => DEFAULT_BUCKETS.map(toDraft));
  // 发薪日必填，默认 1 号（1 号的周期与自然月等价），用户只能改成别的 1-31 的日期
  const [salaryDayText, setSalaryDayText] = useState(String(DEFAULT_SALARY_DAY));
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 先取配置：收支口径取决于里面的发薪日，所以统计只能等它回来再发
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const goal = await getSavingsGoal();
        if (cancelled) return;
        if (goal) {
          setName(goal.name || DEFAULT_GOAL_NAME);
          if (goal.buckets?.length) {
            setBuckets(goal.buckets.map(toDraft));
          }
          // 老数据里发薪日是 NULL（当时默认自然月），这里同样回落到默认值
          setSalaryDayText(toSalaryDayDraft(goal.salaryDay ?? DEFAULT_SALARY_DAY));
        }
      } catch (err) {
        if (!cancelled) setError(failMessage(err, "加载攒钱目标失败"));
      } finally {
        if (!cancelled) {
          setGoalLoaded(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const salaryDay = useMemo(() => parseSalaryDay(salaryDayText), [salaryDayText]);
  // 空串会被解析成 null，所以「非法」本身就涵盖了「为空」这一种情况。
  // 非法时只标红边框 + 禁用保存，不在弹窗里写任何错误文案。
  const salaryDayInvalid = salaryDay === null;
  // 与面板当前查看的周期无关：目标本身就是按「每月」定的
  const cycle = useMemo(() => salaryCycleRange(salaryDay), [salaryDay]);

  // 收支按发薪周期统计；改发薪日会重取，输入过程略作防抖
  useEffect(() => {
    if (!goalLoaded) return;
    let cancelled = false;
    const controller = new AbortController();
    setStatsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const summary = await getBillSummary(fmtDate(cycle.start), fmtDate(cycle.end), controller.signal);
        if (cancelled) return;
        setMonthIncome(summary.income);
        setMonthExpense(summary.expense);
      } catch (err) {
        if (!cancelled) setError(failMessage(err, "加载收支汇总失败"));
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [goalLoaded, cycle]);

  const periodWord = cycle.isSalaryCycle ? "本发薪周期" : "本月";
  const periodRange = cycle.isSalaryCycle
    ? `${fmtMonthDay(cycle.start)} 至今`
    : "本月 1 日至今";

  const totalPercent = useMemo(
    () => buckets.reduce((sum, b) => sum + parsePercent(b.percent), 0),
    [buckets]
  );
  const nameValid = buckets.length > 0 && buckets.every((b) => b.name.trim().length > 0);
  const percentValid = totalPercent === 100;
  const canSave = nameValid && percentValid && salaryDay !== null;

  const allocations = useMemo(
    () =>
      buckets.map((b) => ({
        ...b,
        percentValue: parsePercent(b.percent),
        amount: (monthIncome * parsePercent(b.percent)) / 100,
      })),
    [buckets, monthIncome]
  );
  const savingTotal = allocations.filter((a) => a.saving).reduce((s, a) => s + a.amount, 0);
  const budgetTotal = allocations.filter((a) => !a.saving).reduce((s, a) => s + a.amount, 0);
  const budgetRemaining = budgetTotal - monthExpense;

  const updateBucket = (index: number, patch: Partial<BucketDraft>) => {
    setBuckets((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const addBucket = () => {
    if (buckets.length >= MAX_BUCKETS) {
      toast.error(`最多只能设置 ${MAX_BUCKETS} 个档位`);
      return;
    }
    setBuckets((prev) => [...prev, { name: "", percent: "0", saving: false }]);
  };

  const removeBucket = (index: number) => {
    setBuckets((prev) => prev.filter((_, i) => i !== index));
  };

  const resetDefaults = () => {
    setName(DEFAULT_GOAL_NAME);
    setBuckets(DEFAULT_BUCKETS.map(toDraft));
    setSalaryDayText(String(DEFAULT_SALARY_DAY));
    setError(null);
  };

  const submit = async () => {
    if (!nameValid) {
      setError("档位名称不能为空");
      return;
    }
    if (!percentValid) {
      setError(`各档位比例合计必须为 100%，当前为 ${totalPercent}%`);
      return;
    }
    if (salaryDayInvalid) {
      // 保存按钮本来就是禁用的，这里静默兜底，不再往弹窗里写提示
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveSavingsGoal({
        name: name.trim() || null,
        buckets: buckets.map((b) => ({
          name: b.name.trim(),
          percent: parsePercent(b.percent),
          saving: b.saving,
        })),
        // 空串会被解析成 null，服务端据此清空发薪日配置
        salaryDay,
      });
      toast.success("攒钱目标已保存");
      onClose();
    } catch (err) {
      toast.error(failMessage(err, "保存攒钱目标失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-900/20 dark:bg-black/60" />
      <div
        className="relative @container flex max-h-[85vh] w-[52rem] max-w-[94vw] flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/95 shadow-lg dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              攒钱目标
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              把每月收入按比例分配，非储蓄档的合计就是本周期的可用预算
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="shrink-0 rounded-full p-1 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* 两栏：左边填写配置，右边实时展示测算结果。
                用容器查询而不是视口断点：弹窗被窗口压窄时自动堆成一栏，免得两栏都被压扁。
                阈值取 48rem 而不是弹窗宽度 52rem：容器查询量的是内容盒，
                全局 box-sizing: border-box 下弹窗的 1px 边框会让内容盒比 52rem 小一点点，
                卡在等号上就会永远不生效。 */}
            <div className="grid gap-5 @[48rem]:grid-cols-[minmax(0,1fr)_19rem]">
              {/* 左栏：填写 */}
              <div className="min-w-0">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="目标名称"
                  className="w-full rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                />

                {/* 发薪日：决定下面收入/支出按哪个周期统计 */}
                <div className="mt-3 rounded-lg border border-neutral-900/10 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <label
                        htmlFor="salary-day"
                        className="text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        发薪日
                        <span className="ml-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                          必填
                        </span>
                      </label>
                      <p className="mt-0.5 text-[11px] leading-4 text-neutral-400 dark:text-neutral-500">
                        按「{periodRange}」统计收支
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">每月</span>
                      <input
                        id="salary-day"
                        value={salaryDayText}
                        onChange={(e) => setSalaryDayText(e.target.value)}
                        onBlur={() =>
                          setSalaryDayText(
                            salaryDay ? String(salaryDay) : String(DEFAULT_SALARY_DAY)
                          )
                        }
                        type="number"
                        min={1}
                        max={31}
                        step={1}
                        placeholder={String(DEFAULT_SALARY_DAY)}
                        className={cn(
                          "w-16 rounded-lg border bg-white/80 px-2 py-1.5 text-right text-sm tabular-nums text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:bg-neutral-800/60 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-white",
                          salaryDayInvalid
                            ? "border-red-500 dark:border-red-500"
                            : "border-neutral-900/15 dark:border-white/15"
                        )}
                      />
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">日</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  {statsLoading ? (
                    <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      正在统计{periodWord}收支…
                    </span>
                  ) : (
                    <>
                      <span>
                        {periodWord}收入 <span className="tabular-nums text-neutral-900 dark:text-neutral-100">¥{fmtAmount(monthIncome)}</span>
                      </span>
                      <span>
                        {periodWord}支出 <span className="tabular-nums text-neutral-900 dark:text-neutral-100">¥{fmtAmount(monthExpense)}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* 档位编辑 */}
                <div className="mt-3 space-y-2">
                  {buckets.map((bucket, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={bucket.name}
                        onChange={(e) => updateBucket(index, { name: e.target.value })}
                        placeholder="档位名称"
                        className="min-w-0 flex-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-neutral-900 dark:focus:border-white"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <input
                          value={bucket.percent}
                          onChange={(e) => updateBucket(index, { percent: e.target.value })}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          className="w-14 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/80 dark:bg-neutral-800/60 px-2 py-1.5 text-right text-sm tabular-nums text-neutral-900 dark:text-neutral-100 outline-none transition-colors focus:border-neutral-900 dark:focus:border-white"
                        />
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">%</span>
                      </div>
                      <label
                        title="标记为储蓄档：不计入本周期可用预算"
                        className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"
                      >
                        <input
                          type="checkbox"
                          checked={bucket.saving}
                          onChange={(e) => updateBucket(index, { saving: e.target.checked })}
                          className="h-3.5 w-3.5 accent-neutral-900 dark:accent-neutral-100"
                        />
                        储蓄
                      </label>
                      <button
                        onClick={() => removeBucket(index)}
                        disabled={buckets.length <= 1}
                        aria-label="删除档位"
                        className="shrink-0 rounded-full p-1 text-neutral-400 dark:text-neutral-500 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={addBucket}
                    className="flex items-center gap-1 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
                  >
                    <Plus className="h-3 w-3" />
                    添加档位
                  </button>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      percentValid ? "text-neutral-500 dark:text-neutral-400" : "text-red-500"
                    )}
                  >
                    合计 {totalPercent}%{percentValid ? "" : "（需为 100%）"}
                  </span>
                </div>

                {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
              </div>

              {/* 右栏：按周期收入测算 */}
              <div className="min-w-0">
                {/* h-full + flex-col：卡片撑满左栏撑出来的行高，多出来的空间由底部的
                    汇总块（mt-auto）吃掉，这样右栏高度始终和左栏对齐，而不是只包住自己的内容 */}
                <div className="flex h-full flex-col rounded-xl border border-neutral-900/10 dark:border-white/10 bg-white/40 px-3 py-3 text-sm dark:bg-white/5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-neutral-500 dark:text-neutral-400">
                      按{periodWord}收入测算
                    </p>
                    {cycle.isSalaryCycle && (
                      <p className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                        {periodRange}
                      </p>
                    )}
                  </div>
                  {statsLoading ? (
                    <p className="mt-2 flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      正在统计…
                    </p>
                  ) : monthIncome <= 0 ? (
                    <p className="mt-2 leading-5 text-neutral-400 dark:text-neutral-500">
                      {periodWord}还没有收入记录，先在账单里记一笔收入，这里就能算出各档金额。
                    </p>
                  ) : (
                    <>
                      <ul className="mt-2 mb-3 space-y-1.5">
                        {allocations.map((a, index) => (
                          <li key={index} className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-neutral-700 dark:text-neutral-300">
                              {a.name.trim() || "未命名"}
                              <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
                                {a.percentValue}%
                              </span>
                              {a.saving && (
                                <span className="ml-1.5 rounded-full bg-neutral-900/8 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                                  储蓄
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 tabular-nums text-neutral-900 dark:text-neutral-100">
                              ¥{fmtAmount(a.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto space-y-1.5 border-t border-neutral-900/10 pt-2.5 dark:border-white/10">
                        <PreviewRow label="储蓄合计" value={`¥${fmtAmount(savingTotal)}`} />
                        <PreviewRow label="非储蓄预算" value={`¥${fmtAmount(budgetTotal)}`} />
                        <PreviewRow
                          label={`${periodWord}已支出`}
                          value={`¥${fmtAmount(monthExpense)}`}
                        />
                        <PreviewRow
                          label={budgetRemaining >= 0 ? "预算剩余" : "预算超支"}
                          value={`${budgetRemaining >= 0 ? "" : "-"}¥${fmtAmount(Math.abs(budgetRemaining))}`}
                          tone={budgetRemaining >= 0 ? "ok" : "bad"}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-neutral-900/10 dark:border-white/10 px-5 py-4">
          <button
            onClick={resetDefaults}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={saving || loading || !canSave}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-50 transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          tone === "bad"
            ? "text-red-600 dark:text-red-400"
            : tone === "ok"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-700 dark:text-neutral-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}
