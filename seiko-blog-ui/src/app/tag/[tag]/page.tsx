import type { Metadata } from "next";
import BlogListing from "@/app/blog/BlogListing";

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

function decodeTag(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { tag } = await params;
  return { title: decodeTag(tag) + " - Seiko Blog" };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const [{ tag }, { page }] = await Promise.all([params, searchParams]);
  return <BlogListing page={page} tag={decodeTag(tag)} />;
}
