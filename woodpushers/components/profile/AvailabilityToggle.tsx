"use client";

import { useState, useTransition } from "react";
import { setOpenToday } from "@/app/(app)/me/actions";
import { cn } from "@/lib/utils";

/** One-tap "Up for a game today" toggle. Auto-expires tonight. */
export function AvailabilityToggle({ active }: { active: boolean }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    // Local end-of-day, computed on the device so timezones are respected.
    const midnight = new Date();
    midnight.setHours(23, 59, 0, 0);
    start(() => setOpenToday(next, midnight.toISOString()));
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card",
      )}
    >
      <span className="font-medium">Up for a game today</span>
      <span
        className={cn(
          "text-sm",
          on ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {on ? "On, until tonight" : "Off"}
      </span>
    </button>
  );
}
