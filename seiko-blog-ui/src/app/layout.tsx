import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import SiteContent from "@/components/SiteContent";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Seiko Blog - 个人博客",
  description: "一个简洁优雅的个人博客，分享技术、生活与思考",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col">
        <Header />
        <ToastProvider>
          <SiteContent>{children}</SiteContent>
        </ToastProvider>
      </body>
    </html>
  );
}
