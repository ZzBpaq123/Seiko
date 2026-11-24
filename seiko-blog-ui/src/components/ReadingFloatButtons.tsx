"use client";

import { useState, useEffect } from "react";
import { ArrowUp, ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReadingFloatButtons({ articleId }: { articleId: string }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const isComplete = progress === 100;
  const router = useRouter();

  useEffect(() => {
    const article = document.getElementById(articleId);
    if (!article) return;

    const updateProgress = () => {
      const { bottom, height } = article.getBoundingClientRect();
      const remaining = bottom - window.innerHeight;
      const scrollRange = height - window.innerHeight;
      let nextProgress = 0;
      if (remaining <= 1) {
        nextProgress = 100;
      } else if (scrollRange > 0) {
        nextProgress = Math.max(0, Math.floor((1 - remaining / scrollRange) * 100));
      }

      setProgress(nextProgress);
      setVisible(window.scrollY > 200 || nextProgress === 100);
    };

    let frameId = 0;
    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        updateProgress();
      });
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(article);
    if (article.parentElement) observer.observe(article.parentElement);
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [articleId]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    router.back();
  };

  // SVG 环形进度条
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`fixed bottom-8 right-6 z-50 flex flex-col gap-4 transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      {/* 浏览进度 */}
      <button
        onClick={scrollToTop}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-lg transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        title={isComplete ? "已读完" : `阅读进度 ${progress}%`}
        aria-label={isComplete ? "已读完" : `阅读进度 ${progress}%`}
      >
        <svg
          className="absolute inset-0 h-14 w-14 -rotate-90"
          viewBox="0 0 56 56"
        >
          {/* 背景圆环 */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-zinc-100 dark:text-zinc-700"
          />
          {/* 进度圆环 */}
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-sky-500 transition-all duration-150 dark:text-sky-400"
          />
        </svg>
        {isComplete ? (
          <Check className="relative z-10 h-5 w-5 text-emerald-500 dark:text-emerald-400" />
        ) : (
          <span className="relative z-10 text-xs font-semibold">
            {progress}
          </span>
        )}
      </button>

      {/* 回到顶部 */}
      <button
        onClick={scrollToTop}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-lg transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        title="回到顶部"
        aria-label="回到顶部"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      {/* 返回上一级 */}
      <button
        onClick={goBack}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-lg transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
        title="返回上一级"
        aria-label="返回上一级"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
