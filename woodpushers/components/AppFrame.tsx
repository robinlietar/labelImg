"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Layout frame: the app renders as a centered phone column on desktop,
 * except admin (and the dev preview's admin section), which go wide for
 * reviewing. Query is read post-mount to keep static prerendering happy.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [previewAdmin, setPreviewAdmin] = useState(false);
  useEffect(() => {
    setPreviewAdmin(
      pathname.startsWith("/dev/preview") &&
        new URLSearchParams(window.location.search).get("s") === "admin",
    );
  }, [pathname]);
  const wide = pathname.startsWith("/admin") || previewAdmin;
  return (
    <div
      className={cn(
        "relative mx-auto min-h-dvh w-full bg-background",
        wide
          ? "max-w-6xl md:px-6"
          : "max-w-md md:border-x md:border-border md:shadow-sm",
      )}
    >
      {children}
    </div>
  );
}
