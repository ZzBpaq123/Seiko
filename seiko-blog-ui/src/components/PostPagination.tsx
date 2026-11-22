import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPostPageItems } from "@/utils/postPagination";

interface PostPaginationProps {
  page: number;
  pages: number;
  hrefForPage: (page: number) => string;
}

const itemClass = "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-1.5 text-sm";
const linkClass = "border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-900/50 dark:text-pink-300 dark:hover:bg-pink-950/40";
const disabledClass = "border-pink-100 text-pink-300 dark:border-pink-900/30 dark:text-pink-800";

export default function PostPagination({ page, pages, hrefForPage }: PostPaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="文章分页" className="mt-10 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} aria-label="上一页" className={itemClass + " " + linkClass}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-disabled="true" aria-label="上一页" className={itemClass + " " + disabledClass}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {getPostPageItems(page, pages).map((item) =>
        typeof item !== "number" ? (
          <span key={item} aria-hidden="true" className="px-1 text-zinc-500 dark:text-zinc-400">…</span>
        ) : item === page ? (
          <span key={item} aria-current="page" className={itemClass + " border-rose-600 bg-rose-600 text-white"}>{item}</span>
        ) : (
          <Link key={item} href={hrefForPage(item)} className={itemClass + " " + linkClass}>{item}</Link>
        ),
      )}
      {page < pages ? (
        <Link href={hrefForPage(page + 1)} aria-label="下一页" className={itemClass + " " + linkClass}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-disabled="true" aria-label="下一页" className={itemClass + " " + disabledClass}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
