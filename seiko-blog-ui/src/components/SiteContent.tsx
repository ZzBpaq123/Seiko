"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { defaultFooterStyle, pageFooterStyles } from "@/styles/pageStyles";
import Footer from "./Footer";

export default function SiteContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const style = pageFooterStyles[pathname] ?? defaultFooterStyle;

  return (
    <div className={"flex flex-1 flex-col bg-(--page-background) " + style.background}>
      <main className="flex-1 pt-14">{children}</main>
      {pathname !== "/gallery" && <Footer textClass={style.text} />}
    </div>
  );
}
