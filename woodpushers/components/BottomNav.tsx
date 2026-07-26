"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Map, Users, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Map", icon: Map, match: (p: string) => p === "/" },
  {
    href: "/players",
    label: "Players",
    icon: Users,
    match: (p: string) => p.startsWith("/players") || p.startsWith("/p/"),
  },
  {
    href: "/chat",
    label: "Chats",
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/chat"),
  },
  { href: "/me", label: "Me", icon: User, match: (p: string) => p === "/me" },
];

/**
 * Fixed bottom tab bar. Big tap targets, safe-area aware, centered to the
 * app column on desktop. Shows an unread badge on Chats, refreshed on focus
 * and every minute.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/unread")
        .then((r) => (r.ok ? r.json() : { unread: 0 }))
        .then((j) => alive && setUnread(j.unread ?? 0))
        .catch(() => {});
    load();
    const onFocus = () => load();
    const timer = setInterval(load, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pathname]);

  // Full-screen conversation view has its own composer; hide the tab bar there.
  if (/^\/chat\/[^/]+$/.test(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:border-x">
      <div className="flex items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          const isChats = t.href === "/chat";
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isChats && unread > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
