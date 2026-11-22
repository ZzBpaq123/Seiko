"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import HeroPanel from "./HeroPanel";
import ActivityPanel from "./ActivityPanel";
import AboutPanel from "./AboutPanel";
import WorkPanel from "./WorkPanel";

/** 滑屏总数量 */
const PANELS = [HeroPanel, ActivityPanel, AboutPanel, WorkPanel];

export default function MyselfClient() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isScrolling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 切换到指定面板
   * @param index 目标面板索引
   */
  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= PANELS.length || isScrolling.current) return;
    isScrolling.current = true;
    setCurrentIndex(index);
    setTimeout(() => {
      isScrolling.current = false;
    }, 800);
  }, []);

  /** 注册滚轮和键盘事件 */
  useEffect(() => {
    const canScroll = (down: boolean) => {
      const panel = containerRef.current?.querySelector("[data-active-panel]");
      if (!panel) return false;
      return down ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 : panel.scrollTop > 0;
    };
    const handleWheel = (e: WheelEvent) => {
      if (isScrolling.current) {
        e.preventDefault();
        return;
      }

      if (Math.abs(e.deltaY) <= 30 || canScroll(e.deltaY > 0)) return;

      if (e.deltaY > 30) {
        if (currentIndex < PANELS.length - 1) {
          e.preventDefault();
          goTo(currentIndex + 1);
        }
        // 在最后一屏向下滚动时不阻止默认行为，允许页面滚动显示 footer
      } else if (e.deltaY < -30) {
        if (currentIndex > 0) {
          e.preventDefault();
          goTo(currentIndex - 1);
        }
        // 在第一屏向上滚动时不阻止默认行为
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowDown" && canScroll(true)) return;
      if (e.key === "ArrowUp" && canScroll(false)) return;
      if (currentIndex < PANELS.length - 1 && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        e.preventDefault();
        goTo(currentIndex + 1);
      } else if (currentIndex > 0 && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        e.preventDefault();
        goTo(currentIndex - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, goTo]);

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-12.8vh)] w-full overflow-hidden -mt-14 -mb-16 bg-[#f8f7f5]"
    >
      {/* 顶部光线效果层 */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-linear-to-b from-blue-500/5 via-transparent to-transparent" />

      {/* 水平滑动容器 */}
      <div
        className="flex h-full transition-transform duration-700 ease-in-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {PANELS.map((Panel, index) => (
          <div
            key={index}
            data-active-panel={currentIndex === index || undefined}
            inert={currentIndex !== index}
            tabIndex={currentIndex === index ? 0 : -1}
            className="h-full w-full shrink-0 overflow-y-auto pt-14 pb-4"
          >
            <Panel />
          </div>
        ))}
      </div>

      {/* 右侧指示器 */}
      <div className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3 sm:right-6">
        {PANELS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-current={i === currentIndex ? "true" : undefined}
            className={`h-2.5 w-2.5 rounded-full transition-all sm:h-3 sm:w-3 ${
              i === currentIndex
                ? "bg-blue-500 scale-125"
                : "bg-stone-900/20 hover:bg-stone-900/40"
            }`}
            aria-label={`切换到第 ${i + 1} 屏`}
          />
        ))}
      </div>
    </div>
  );
}
