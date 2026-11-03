"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, Loader2, MailX, Paperclip, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearHash, usePanelOpen } from "@/hooks/useHash";
import { useLatestRequest } from "@/hooks/useLatestRequest";
import { PanelReveal } from "@/components/PanelReveal";
import {
  getMailDetail,
  listMails,
  markMailRead,
  type MailMessage,
} from "@/lib/mail";
import { buildMailBodyHtml } from "@/lib/mailHtml";
import { toast } from "@/lib/toast";

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, now)) return hhmm;
  if (sameDay(date, yesterday)) return `昨天 ${hhmm}`;
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function failMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function MailPanelContent() {
  const [mails, setMails] = useState<MailMessage[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const listRequest = useLatestRequest();
  const detailRequest = useLatestRequest();

  const open = usePanelOpen("#mail");

  const load = useCallback(async () => {
    const request = listRequest.start();
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMails(request.signal);
      if (!request.isCurrent()) return;
      setMails(list);
    } catch (err) {
      if (!request.isCurrent()) return;
      setLoadError(failMessage(err, "加载邮件失败"));
      setMails([]);
    } finally {
      if (request.isCurrent()) setLoading(false);
    }
  }, [listRequest]);

  useEffect(() => {
    if (!open) return;
    setSelectedUid(null);
    setDetail(null);
    setDetailLoading(false);
    load();
    return () => { listRequest.cancel(); detailRequest.cancel(); };
  }, [open, load, listRequest, detailRequest]);


  const unreadCount = useMemo(() => mails.filter((m) => !m.isRead).length, [mails]);
  const selected = mails.find((m) => m.messageUid === selectedUid) ?? null;

  const selectMail = useCallback((mail: MailMessage) => {
    const request = detailRequest.start();
    setSelectedUid(mail.messageUid);
    setDetail(null);
    setDetailLoading(true);
    // 本地立即置为已读，服务端同步失败不影响展示
    setMails((prev) =>
      prev.map((m) => (m.messageUid === mail.messageUid ? { ...m, isRead: true } : m))
    );
    markMailRead(mail.messageUid).catch(() => {});
    getMailDetail(mail.messageUid, request.signal)
      .then(result => { if (request.isCurrent()) setDetail(result); })
      .catch(err => { if (request.isCurrent()) toast.error(failMessage(err, "加载邮件详情失败")); })
      .finally(() => { if (request.isCurrent()) setDetailLoading(false); });
  }, [detailRequest]);

  const displayDetail = detail ?? null;
  // 正文优先按 HTML 渲染（链接可点击、实体自动解码），纯文本则转义后再渲染
  const bodyHtml = useMemo(() => {
    if (!displayDetail) return "";
    return buildMailBodyHtml(displayDetail.contentHtml, displayDetail.contentText);
  }, [displayDetail]);

  return (
    <PanelReveal open={open}>
    <div className="pointer-events-auto fixed bottom-6 left-6 right-24 top-24 z-10 flex gap-4">
      {/* 左：邮件列表 */}
      <aside className="flex w-85 shrink-0 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-900/10 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <Inbox className="h-4 w-4" />
            <span className="text-sm font-semibold">收件箱</span>
            {!loading && !loadError && (
              <span className="rounded-full bg-neutral-900/5 dark:bg-white/5 px-2 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                {unreadCount} 封未读
              </span>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            aria-label="刷新"
            className="rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50 disabled:opacity-50"
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在收取邮件…
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-neutral-500 dark:text-neutral-400">
              <MailX className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
              <p className="max-w-55 text-center text-xs leading-5">{loadError}</p>
              <button
                onClick={load}
                className="rounded-lg border border-neutral-900/15 dark:border-white/15 bg-white/60 dark:bg-neutral-800/60 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 transition-colors hover:border-neutral-900 dark:hover:border-white"
              >
                重试
              </button>
            </div>
          ) : mails.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-400 dark:text-neutral-500">
              收件箱为空
            </div>
          ) : (
            mails.map((mail) => (
              <MailRow key={mail.messageUid} mail={mail} selected={mail.messageUid === selectedUid} onSelect={selectMail} />
            ))
          )}
        </div>
      </aside>

      {/* 右：邮件详情 */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-900/15 dark:border-white/15 bg-white/20 dark:bg-white/5 shadow-sm">
        {detailLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载邮件内容…
          </div>
        ) : displayDetail && selected ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-neutral-900/10 dark:border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
                {displayDetail.subject || "（无主题）"}
              </h2>
              <button
                onClick={clearHash}
                aria-label="关闭"
                className="shrink-0 rounded-full p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-900/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-neutral-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 border-b border-neutral-900/10 dark:border-white/10 px-6 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900/10 dark:bg-white/10 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {(displayDetail.fromName || displayDetail.fromAddress || "?").slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {displayDetail.fromName || displayDetail.fromAddress || "未知发件人"}
                </p>
                <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                  &lt;{displayDetail.fromAddress || "unknown"}&gt;
                </p>
              </div>
              <span className="ml-auto shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                {formatTime(displayDetail.receiveTime)}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {bodyHtml ? (
                <div
                  className="mail-html text-sm text-neutral-700 dark:text-neutral-300"
                  // 正文已由 buildMailBodyHtml 清洗（去脚本/事件属性/javascript: 协议），链接统一新标签页打开
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p className="text-sm text-neutral-400 dark:text-neutral-500">（无正文内容）</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
            {selected ? "加载邮件内容失败" : "选择一封邮件查看内容"}
          </div>
        )}
      </section>
    </div>
    </PanelReveal>
  );
}

export const MailPanel = memo(MailPanelContent);

const MailRow = memo(function MailRow({ mail, selected, onSelect }: {
  mail: MailMessage;
  selected: boolean;
  onSelect: (mail: MailMessage) => void;
}) {
  return (
    <button
      onClick={() => onSelect(mail)}
      className={cn(
        "group relative flex w-full items-start gap-3 border-b border-neutral-900/5 dark:border-white/5 px-4 py-3 text-left transition-colors",
        selected ? "bg-neutral-900/5 dark:bg-white/5" : "hover:bg-neutral-900/3"
      )}
    >
      {/* 四角断开式角标：仅悬停时显示，四边中段留空 */}
      <span className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l border-t border-neutral-900/50 dark:border-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r border-t border-neutral-900/50 dark:border-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b border-l border-neutral-900/50 dark:border-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b border-r border-neutral-900/50 dark:border-white/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      {/* 选中项：实体线段沿边框周长循环跑动（offset-path 运动路径） */}
      {selected && (
        <span aria-hidden className="mail-runner" />
      )}
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900/10 dark:bg-white/10 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {(mail.fromName || mail.fromAddress || "?").slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              !mail.isRead ? "font-semibold text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"
            )}
          >
            {mail.fromName || mail.fromAddress || "未知发件人"}
          </span>
          <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
            {formatTime(mail.receiveTime)}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-sm",
            !mail.isRead ? "font-medium text-neutral-900 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-300"
          )}
        >
          {mail.subject || "（无主题）"}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-400 dark:text-neutral-500">
          {mail.hasAttachment && <Paperclip className="h-3 w-3 shrink-0" />}
          <span className="truncate">{mail.fromAddress || ""}</span>
        </span>
      </span>
      {!mail.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
    </button>
  );
});
