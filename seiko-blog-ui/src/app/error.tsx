"use client";

export default function ErrorPage() {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">页面暂时无法加载</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-300">请稍后重试。</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
      >
        重新加载
      </button>
    </div>
  );
}
