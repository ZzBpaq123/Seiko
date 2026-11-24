"use client";

import type { PageResult } from "@/types";

interface PaginationProps {
  pageResult: PageResult<unknown> | null;
  page: number;
  onChange: (page: number) => void;
}

function getPageItems(page: number, pages: number) {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }
  if (page <= 4) {
    return [1, 2, 3, 4, 5, "end-gap", pages];
  }
  if (page >= pages - 3) {
    return [1, "start-gap", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  }
  return [1, "start-gap", page - 1, page, page + 1, "end-gap", pages];
}

/** 列表页统一分页控件：左侧总数，右侧上一页 / 页码 / 下一页。 */
export default function Pagination({ pageResult, page, onChange }: PaginationProps) {
  const total = pageResult?.total ?? 0;
  const pages = pageResult?.pages ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-gray-500">共 {total} 条记录</span>
      <nav aria-label="分页" className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </button>
        {getPageItems(page, pages).map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              aria-current={item === page ? "page" : undefined}
              className={`btn btn-sm ${item === page ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          ) : (
            <span key={item} aria-hidden="true" className="px-2 text-sm text-gray-500">
              …
            </span>
          ),
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </button>
      </nav>
    </div>
  );
}
