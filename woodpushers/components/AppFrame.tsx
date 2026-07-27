"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Layout frame: the app renders as a centered phone column on desktop,
 * except admin, which needs the full width for reviewing.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname.startsWith("/admin");
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
