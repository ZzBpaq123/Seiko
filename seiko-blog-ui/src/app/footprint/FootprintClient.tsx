"use client";

import { useEffect, useRef, useState } from "react";
import type { FootprintVO } from "@/api/types";
import { loadAMap } from "@/utils/amap";

interface AMapMap {
  add(markers: AMapMarker[]): void;
  setFitView(markers: AMapMarker[]): void;
  destroy(): void;
}

interface AMapMarker {
  on(event: "click", callback: () => void): void;
}

interface AMapInfoWindow {
  open(map: AMapMap, position: [number, number]): void;
  setContent(content: HTMLElement): void;
}

interface AMapPixel {
  x: number;
  y: number;
}

interface AMapStatic {
  Map: new (element: HTMLElement, options: {
    zoom: number;
    center: [number, number];
    viewMode: "2D" | "3D";
    mapStyle: string;
  }) => AMapMap;
  Marker: new (options: {
    position: [number, number];
    content: HTMLElement;
    offset: AMapPixel;
  }) => AMapMarker;
  InfoWindow: new (options: {
    offset: AMapPixel;
    isCustom: boolean;
    closeWhenClickMap: boolean;
  }) => AMapInfoWindow;
  Pixel: new (x: number, y: number) => AMapPixel;
}

declare global {
  interface Window {
    AMap?: AMapStatic;
  }
}

const mapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
const markerColor = "#B8F1ED";

function footprintLocation(footprint: FootprintVO) {
  return [footprint.province, footprint.country].filter(Boolean).join(" · ");
}

function createInfoContent(footprint: FootprintVO) {
  const panel = document.createElement("div");
  panel.className = "info-window-animated w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl bg-[#1a1a2e] text-white shadow-lg";

  if (footprint.image) {
    try {
      const url = new URL(footprint.image, window.location.href);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const image = document.createElement("img");
        image.className = "h-44 w-full object-cover";
        image.src = url.href;
        image.alt = footprint.city;
        panel.append(image);
      }
    } catch {
      // 忽略无效的图片地址，仍显示足迹信息。
    }
  }

  const content = document.createElement("div");
  content.className = "space-y-1 p-4";
  const title = document.createElement("p");
  title.className = "text-lg font-semibold text-[#B8F1ED]";
  title.textContent = footprint.city;
  const details = document.createElement("p");
  details.className = "text-sm text-zinc-300";
  details.textContent = [footprintLocation(footprint), footprint.footprintDate].filter(Boolean).join(" · ");
  content.append(title, details);
  if (footprint.description) {
    const description = document.createElement("p");
    description.className = "text-sm text-zinc-300";
    description.textContent = footprint.description;
    content.append(description);
  }
  panel.append(content);
  return panel;
}

function configureMap(map: AMapMap, sdk: AMapStatic, footprints: FootprintVO[]) {
  const infoWindow = new sdk.InfoWindow({
    offset: new sdk.Pixel(0, -20),
    isCustom: true,
    closeWhenClickMap: true,
  });

  // 添加涟漪动画样式 + InfoWindow 样式覆盖
  const styleId = "ripple-marker-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .ripple-marker {
        position: relative;
        width: 12px;
        height: 12px;
      }
      .ripple-marker::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        background: ${markerColor};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px ${markerColor}, 0 0 16px ${markerColor}80;
      }
      .ripple {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border: 2px solid ${markerColor};
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: ripple-effect 2s ease-out infinite;
      }
      .ripple:nth-child(2) { animation-delay: 0.5s; }
      .ripple:nth-child(3) { animation-delay: 1s; }
      @keyframes ripple-effect {
        0% { width: 100%; height: 100%; opacity: 0.8; }
        100% { width: 300%; height: 300%; opacity: 0; }
      }
      /* 覆盖高德地图 InfoWindow 默认样式 */
      .amap-info-outer {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
      }
      .amap-info-content {
        background: transparent !important;
        padding: 0 !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      .amap-info-sharp {
        border-top-color: #1a1a2e !important;
      }
      .amap-info-close {
        display: none !important;
      }
      /* InfoWindow 从中心向左右展开动画 */
      @keyframes info-window-expand {
        0% {
          transform: scaleX(0);
          opacity: 0;
        }
        100% {
          transform: scaleX(1);
          opacity: 1;
        }
      }
      .info-window-animated {
        transform-origin: center bottom;
        animation: info-window-expand 0.3s ease-out forwards;
      }
      .info-window-animated .info-window-content {
        opacity: 0;
        animation: info-window-content-fade 0.2s ease-out 0.15s forwards;
      }
      @keyframes info-window-content-fade {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const markers: AMapMarker[] = [];
  for (const footprint of footprints) {
    if (!Number.isFinite(footprint.lat) || !Number.isFinite(footprint.lng)) continue;
    const position: [number, number] = [footprint.lng, footprint.lat];
    const container = document.createElement("div");
    container.className = "ripple-marker";
    for (let i = 0; i < 3; i++) {
      const ripple = document.createElement("div");
      ripple.className = "ripple";
      container.append(ripple);
    }
    const marker = new sdk.Marker({ position, content: container, offset: new sdk.Pixel(-6, -6) });
    marker.on("click", () => {
      infoWindow.setContent(createInfoContent(footprint));
      infoWindow.open(map, position);
    });
    markers.push(marker);
  }

  if (markers.length > 0) {
    map.add(markers);
    map.setFitView(markers);
  }
}

export default function FootprintClient({ footprints }: { footprints: FootprintVO[] | null }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "unavailable">(
    mapKey ? "loading" : "unavailable",
  );
  const locations = footprints ?? [];

  useEffect(() => {
    if (!mapKey || !footprints?.length) return;
    let cancelled = false;
    let map: AMapMap | undefined;

    loadAMap(mapKey).then(() => {
      if (cancelled || !mapRef.current || !window.AMap) return;
      const sdk = window.AMap;
      map = new sdk.Map(mapRef.current, {
        zoom: 4,
        center: [105, 35],
        viewMode: "2D",
        mapStyle: "amap://styles/dark",
      });
      configureMap(map, sdk, footprints);
      setMapState("ready");
    }).catch(() => {
      if (cancelled) return;
      map?.destroy();
      map = undefined;
      setMapState("unavailable");
    });
    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [footprints]);

  const showMap = locations.length > 0 && mapState !== "unavailable";
  const showList = !showMap || mapState === "loading";

  return (
    <div className="relative -mt-14 min-h-screen">
      {showMap && (
        <div
          ref={mapRef}
          className={mapState === "loading" ? "invisible absolute inset-0 h-screen w-full" : "h-screen w-full"}
          aria-label="足迹地图"
        />
      )}
      {!showList && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-b from-transparent to-(--page-background) to-90%" />
      )}
      {showList && (
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-24">
          <h1 className="text-3xl font-bold">足迹</h1>
          <p role="status" className="mt-4 text-zinc-600 dark:text-zinc-300">
            {footprints === null ? "足迹暂时无法加载，请稍后刷新重试。" :
              locations.length === 0 ? "暂无足迹" :
              mapState === "loading" ? "正在加载地图…" : "地图暂时无法显示，你仍可以查看足迹列表。"}
          </p>
          <ul className="mt-6 space-y-4">
            {locations.map((footprint) => (
              <li key={footprint.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="font-semibold">{footprint.city}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {[footprintLocation(footprint), footprint.footprintDate].filter(Boolean).join(" · ")}
                </p>
                {footprint.description && <p className="mt-2 break-words">{footprint.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
