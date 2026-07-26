"use client";

import { KIND_LABEL, PLACE_KINDS, type PlaceKind } from "@/lib/places";
import { cn } from "@/lib/utils";

/** Horizontal scroll row of kind toggles over the map. */
export function KindFilter({
  value,
  onChange,
}: {
  value: PlaceKind[];
  onChange: (next: PlaceKind[]) => void;
}) {
  const toggle = (k: PlaceKind) =>
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PLACE_KINDS.map((k) => {
        const active = value.includes(k);
        return (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card/95 text-foreground",
            )}
          >
            {KIND_LABEL[k]}
          </button>
        );
      })}
    </div>
  );
}
