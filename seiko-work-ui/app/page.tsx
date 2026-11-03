"use client";

import { MobiusBackground } from "@/components/MobiusBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { SideNav } from "@/components/SideNav";
import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType } from "react";
import { preloadPanel } from "@/lib/panelModules";
import { LoginPanel } from "@/components/LoginPanel";
import { useHash, usePanelOpen } from "@/hooks/useHash";

const MailPanel = dynamic(() => import("@/components/MailPanel").then(m => m.MailPanel), { ssr: false });
const SchedulePanel = dynamic(() => import("@/components/SchedulePanel").then(m => m.SchedulePanel), { ssr: false });
const BillPanel = dynamic(() => import("@/components/BillPanel").then(m => m.BillPanel), { ssr: false });

function RetainedPanel({ route, component: Component }: { route: string; component: ComponentType }) {
  const open = usePanelOpen(route);
  const [visited, setVisited] = useState(false);
  useEffect(() => { if (open) setVisited(true); }, [open]);
  // After the first visit keep the same instance, including drafts and exit animations.
  return open || visited ? <Component /> : null;
}

export default function Home() {
  const hash = useHash();
  useEffect(() => {
    // Warm the current hash immediately and the remaining code after initial work.
    void preloadPanel(window.location.hash).catch(() => {});
    const warm = () => { for (const route of ["#mail", "#schedule", "#bill"]) void preloadPanel(route).catch(() => {}); };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 1000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(warm, 200);
    return () => clearTimeout(timer);
  }, []);
  const pageOpen = hash.startsWith("#") && hash !== "#";

  return (
    <>
      <MobiusBackground />
      {pageOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-5 bg-[#FAFAF7]/15 backdrop-blur-none dark:bg-black/10"
        />
      )}
      <SiteHeader />
      <SideNav />
      <RetainedPanel route="#mail" component={MailPanel} />
      <RetainedPanel route="#schedule" component={SchedulePanel} />
      <RetainedPanel route="#bill" component={BillPanel} />
      <LoginPanel />
    </>
  );
}
