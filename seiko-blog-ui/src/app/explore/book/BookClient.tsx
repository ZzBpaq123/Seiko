"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import dynamic from "next/dynamic";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import type { BookVO } from "@/api/types";
import BookList from "./components/BookList";

const MoebiusScene = dynamic(
  () => import("./components/moebius/MoebiusScene"),
  { ssr: false, loading: () => <div className="bg-amber-50 dark:bg-amber-950" /> },
);

interface BookClientProps {
  initialBooks: BookVO[];
}

const SCROLL_LOCK_MS = 600;
const SCROLL_THRESHOLD = 30;
const TOUCH_THRESHOLD = 40;

export default function BookClient({ initialBooks: books }: BookClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollBoost, setScrollBoost] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const isScrollingRef = useRef(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const boostTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxIndex = Math.max(0, books.length - 2);

  // 总屏数（每屏展示 2 本书）
  const pageCount = Math.max(1, books.length - 1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const triggerBoost = useCallback(() => {
    setScrollBoost(1.2);
    if (boostTimeoutRef.current) clearTimeout(boostTimeoutRef.current);
    boostTimeoutRef.current = setTimeout(() => setScrollBoost(0), 350);
  }, []);

  const jumpTo = useCallback(
    (target: number) => {
      if (isScrollingRef.current) return;

      const next = Math.max(0, Math.min(target, maxIndex));
      if (next === currentIndex) return;

      isScrollingRef.current = true;
      setCurrentIndex(next);
      triggerBoost();

      setTimeout(() => {
        isScrollingRef.current = false;
      }, SCROLL_LOCK_MS);
    },
    [currentIndex, maxIndex, triggerBoost],
  );

  const goTo = useCallback(
    (direction: 1 | -1) => {
      jumpTo(currentIndex + direction);
    },
    [currentIndex, jumpTo],
  );

  const startSwipe = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches.length === 1 ? event.touches[0] : undefined;
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const endSwipe = (event: TouchEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    if (!start || !touch) return;
    const deltaY = start.y - touch.clientY;
    if (Math.abs(deltaY) > TOUCH_THRESHOLD && Math.abs(deltaY) > Math.abs(start.x - touch.clientX)) {
      goTo(deltaY > 0 ? 1 : -1);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || reduceMotion) return;

    const handleWheel = (e: WheelEvent) => {
      if (isScrollingRef.current) {
        e.preventDefault();
        return;
      }

      if (e.deltaY > SCROLL_THRESHOLD) {
        if (currentIndex < maxIndex) {
          e.preventDefault();
          goTo(1);
        }
      } else if (e.deltaY < -SCROLL_THRESHOLD) {
        if (currentIndex > 0) {
          e.preventDefault();
          goTo(-1);
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [currentIndex, maxIndex, goTo, reduceMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (currentIndex < maxIndex && (e.key === "ArrowDown" || e.key === "ArrowRight")) {
        e.preventDefault();
        goTo(1);
      } else if (currentIndex > 0 && (e.key === "ArrowUp" || e.key === "ArrowLeft")) {
        e.preventDefault();
        goTo(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, maxIndex, goTo]);

  useEffect(() => {
    return () => {
      if (boostTimeoutRef.current) clearTimeout(boostTimeoutRef.current);
    };
  }, []);

  if (books.length === 0) {
    return (
      <div className="-mb-16 -mt-14 flex min-h-screen items-center justify-center bg-amber-50 px-4 dark:bg-amber-950">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-amber-300 dark:text-amber-700" />
          <p className="text-lg text-amber-800 dark:text-amber-200">暂无书籍</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-mb-16 -mt-14 flex h-screen overflow-hidden bg-amber-50 dark:bg-amber-950">
      {/* 左侧：3D 莫比乌斯环 */}
      <section className="relative hidden h-full w-1/2 bg-amber-50 dark:bg-amber-950 lg:block">
        <MoebiusScene
          scrollBoost={scrollBoost}
          reducedMotion={reduceMotion}
          isDark={isDark}
        />

        <div className="absolute bottom-8 left-8 z-10">
          <h1 className="text-4xl font-bold tracking-tight text-amber-950 dark:text-amber-50">
            书籍
          </h1>
          <p className="mt-1 text-sm font-medium tracking-widest text-amber-800/50 dark:text-amber-200/50">
            BOOKS
          </p>
        </div>
      </section>

      {/* 右侧：图书列表 */}
      <section className="relative flex h-full w-full flex-col lg:w-1/2">
        <div className="flex flex-1 flex-col overflow-hidden px-6 pt-18 pb-4 md:px-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-amber-950 dark:text-amber-50">书籍</h1>
              <p className="text-xs tracking-widest text-amber-700/70 dark:text-amber-300/70">BOOKS</p>
            </div>

            <div aria-live="polite" className="flex items-center gap-3 text-sm text-amber-700/70 dark:text-amber-300/70">
              <span>{currentIndex + 1}</span>
              <span>/</span>
              <span>{pageCount}</span>
            </div>
          </div>

          <div
            onTouchStart={startSwipe}
            onTouchEnd={endSwipe}
            onTouchCancel={() => { swipeStart.current = null; }}
            className="relative flex-1 overflow-hidden [touch-action:pan-x_pinch-zoom] rounded-2xl border border-amber-900/5 bg-white/60 shadow-xl backdrop-blur-sm dark:border-amber-100/5 dark:bg-black/20">
            <BookList books={books} currentIndex={currentIndex} />
          </div>

          {pageCount > 1 && (
            <div className="mt-3 flex justify-between gap-3">
              <button type="button" disabled={currentIndex === 0} onClick={() => goTo(-1)} className="rounded-lg border border-amber-700/20 px-3 py-2 text-sm font-medium text-amber-950 disabled:opacity-40 dark:border-amber-100/20 dark:text-amber-100">
                <ChevronUp aria-hidden="true" className="mr-1 inline h-4 w-4" />上一屏
              </button>
              <button type="button" disabled={currentIndex === maxIndex} onClick={() => goTo(1)} className="rounded-lg border border-amber-700/20 px-3 py-2 text-sm font-medium text-amber-950 disabled:opacity-40 dark:border-amber-100/20 dark:text-amber-100">
                下一屏<ChevronDown aria-hidden="true" className="ml-1 inline h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
