"use client";

import { PLACE_KINDS, type PlaceKind } from "@/lib/places";
import { cn } from "@/lib/utils";

/** Short labels sized for a 390px viewport chip row. */
const SHORT_LABEL: Record<PlaceKind, string> = {
  club: "Clubs",
  cafe: "Cafes",
  bar: "Bars",
  park: "Parks",
  library: "Libraries",
  community_center: "Community",
  tournament_venue: "Tournaments",
  shop: "Shops",
  other: "Other",
};

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
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PLACE_KINDS.map((k) => {
          const active = value.includes(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/95 text-foreground",
              )}
            >
              {SHORT_LABEL[k]}
            </button>
          );
        })}
      </div>
      {/* Right-edge fade: signals there are more chips to scroll. */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/70 to-transparent" />
    </div>
  );
}
