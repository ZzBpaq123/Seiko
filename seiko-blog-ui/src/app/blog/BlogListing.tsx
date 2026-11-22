import Image from "next/image";
import PostCard from "@/components/PostCard";
import PostPagination from "@/components/PostPagination";
import { loadPostPage } from "@/utils/postPagination";
import TagCloud from "@/components/TagCloud";
import { getPostList, getPostsByTag, getTagCounts } from "@/api/post";

const PAGE_SIZE = 8;

export default async function BlogListing({ page, tag }: { page?: string | string[]; tag?: string }) {
  const [articlePage, tagCounts] = await Promise.all([
    loadPostPage(page, PAGE_SIZE, tag ? (params) => getPostsByTag(tag, params) : getPostList),
    getTagCounts().catch(() => []),
  ]);
  const { result } = articlePage;
  const listingPath = tag ? "/tag/" + encodeURIComponent(tag) : "/blog";

  return (
    <div className="-mt-14 min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section
        className="relative flex h-[80vh] flex-col bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/article_bg.jpg")' }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Content */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
              {tag ? "标签 · " + tag : "文章列表"}
            </h1>
            <p className="mt-3 text-lg text-white/80 drop-shadow">
              共 {result.total} 篇文章
            </p>
          </div>
        </div>
        {/* Banner Waves at Bottom */}
        <div className="relative z-10 w-full leading-0 overflow-hidden">
          <div className="animate-wave-slow flex w-[200%]">
            <Image
              src="/bannerWave2.png"
              alt=""
              width={1920}
              height={200}
              quality={100}
              className="block w-1/2 h-15"
              priority
              unoptimized
            />
            <Image
              src="/bannerWave2.png"
              alt=""
              width={1920}
              height={200}
              quality={100}
              className="block w-1/2 h-15"
              priority
              unoptimized
            />
          </div>
          <div className="absolute bottom-0 left-0 flex w-[200%] animate-wave-fast">
            <Image
              src="/bannerWave1.png"
              alt=""
              width={1920}
              height={200}
              quality={100}
              className="block w-1/2 h-15"
              priority
              unoptimized
            />
            <Image
              src="/bannerWave1.png"
              alt=""
              width={1920}
              height={200}
              quality={100}
              className="block w-1/2 h-15"
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      {/* Main Content - Two Column Layout */}
      <section className="relative overflow-hidden bg-white px-4 py-10 dark:bg-zinc-950">
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            {/* Left Column - Posts List */}
            <div>
              {/* Posts List */}
              <div>
                {result.records.length > 0 ? (
                  <div className="grid gap-6">
                    {result.records.map((post, i) => (
                      <PostCard key={post.slug} post={post} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-zinc-500 dark:text-zinc-400">暂无文章</p>
                  </div>
                )}

                <PostPagination page={articlePage.page} pages={articlePage.result.pages} hrefForPage={(page) => listingPath + "?page=" + page} />
              </div>
            </div>

            {/* Right Column - Tag Cloud */}
            <aside className="space-y-6">
              <TagCloud tagCounts={tagCounts} />
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
