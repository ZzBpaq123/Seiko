import type { PageParams, PageResult, PostVO } from "@/api/types";

export async function loadPostPage(
  value: string | string[] | undefined,
  size: number,
  fetchPage: (params: PageParams) => Promise<PageResult<PostVO>>,
) {
  const requested = typeof value === "string" && /^[1-9]\d*$/.test(value) ? Number(value) : 1;
  const page = Number.isSafeInteger(requested) ? requested : 1;
  const result = await fetchPage({ page, size });
  const lastPage = Math.max(result.pages, 1);
  if (page <= lastPage) return { page, result };
  return { page: lastPage, result: await fetchPage({ page: lastPage, size }) };
}

export function getPostPageItems(page: number, pages: number) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "end-gap", pages];
  if (page >= pages - 3) return [1, "start-gap", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "start-gap", page - 1, page, page + 1, "end-gap", pages];
}
