"use client";

import { useState, useTransition } from "react";
import { setVisible } from "@/app/(app)/me/actions";

export function VisibilityToggle({ visible }: { visible: boolean }) {
  const [on, setOn] = useState(visible);
  const [, start] = useTransition();
  return (
    <label className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <span className="text-sm">
        Visible in the players directory
        <span className="block text-xs text-muted-foreground">
          Others only see a rough distance, like ~2 km, never your location.
        </span>
      </span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          start(() => setVisible(e.target.checked));
        }}
        className="h-5 w-5 accent-[hsl(var(--primary))]"
      />
    </label>
  );
}
