"use client";

import Link from "next/link";
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

/** Fixed bottom tab bar for mobile. Big tap targets, safe-area aware. */
export function BottomNav() {
  const pathname = usePathname();
  // Full-screen conversation view has its own composer; hide the tab bar there.
  if (/^\/chat\/[^/]+$/.test(pathname)) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
