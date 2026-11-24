import type { Metadata } from "next";
import BlogListing from "./BlogListing";

export const metadata: Metadata = {
  title: "文章 - Seiko Blog",
  description: "浏览所有博客文章",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { page } = await searchParams;
  return <BlogListing page={page} />;
}
