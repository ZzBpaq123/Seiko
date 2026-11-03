"use client";

import { CalendarDays, Home, Mail, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useHash } from "@/hooks/useHash";
import { useAuthUser } from "@/lib/auth";
import { preloadPanel } from "@/lib/panelModules";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { key: "login", label: "登录", href: "#login", icon: Home }, // icon 占位，登录按钮单独渲染
  { key: "home", label: "首页", href: "#", icon: Home },
  { key: "mail", label: "邮箱", href: "#mail", icon: Mail },
  { key: "schedule", label: "日程", href: "#schedule", icon: CalendarDays },
  { key: "bill", label: "记账", href: "#bill", icon: Wallet },
];

function NavButton({
  item,
  active,
  children,
}: {
  item: NavItem;
  active: boolean;
  children?: React.ReactNode;
}) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      onPointerEnter={() => { void preloadPanel(item.href).catch(() => {}); }}
      onFocus={() => { void preloadPanel(item.href).catch(() => {}); }}
      aria-label={item.label}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border backdrop-blur-sm transition-colors duration-200",
        active
          ? "border-neutral-900 bg-neutral-900 text-neutral-50 dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
          : "border-neutral-900/15 bg-white/70 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-900 hover:text-neutral-50 dark:border-neutral-50/20 dark:bg-neutral-900/70 dark:text-neutral-200 dark:hover:border-neutral-50 dark:hover:bg-neutral-50 dark:hover:text-neutral-900"
      )}
    >
      {children ?? <Icon className="h-5 w-5" />}
    </a>
  );
}

function LoginNavButton({ active }: { active: boolean }) {
  const user = useAuthUser();

  return (
    <NavButton item={{ key: "login", label: "登录", href: "#login", icon: Home }} active={active}>
      {user ? (
        user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt={user.nickname || user.username} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-medium">
            {(user.nickname || user.username).slice(0, 1)}
          </span>
        )
      ) : (
        <span className="text-xs font-medium">登录</span>
      )}
    </NavButton>
  );
}

export function SideNav() {
  const hash = useHash();

  // hash 为空（或仅剩 "#"）表示首页
  const isActive = (item: NavItem) =>
    item.href === "#" ? !hash || hash === "#" : hash === item.href;

  return (
    <nav
      aria-label="功能导航"
      className="fixed right-6 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3"
    >
      {NAV_ITEMS.map((item) =>
        item.key === "login" ? (
          <LoginNavButton key={item.key} active={isActive(item)} />
        ) : (
          <NavButton key={item.key} item={item} active={isActive(item)} />
        )
      )}
      <ThemeToggle />
    </nav>
  );
}
