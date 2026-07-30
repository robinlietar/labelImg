"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * History-aware back: returns to the page you actually came from (city page,
 * players list...), falling back to a fixed route on direct visits.
 */
export function BackLink({
  fallback = "/",
  label = "Back",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        e.preventDefault();
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="flex items-center gap-1 text-sm text-muted-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </a>
  );
}
