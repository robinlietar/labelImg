"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TIME_CONTROLS } from "@/lib/profile";
import { cn } from "@/lib/utils";

const RADII = [5, 10, 25, 50];
const RATING_BANDS = [
  { label: "Any rating", min: "", max: "" },
  { label: "< 1200", min: "", max: "1200" },
  { label: "1200-1600", min: "1200", max: "1600" },
  { label: "1600-2000", min: "1600", max: "2000" },
  { label: "2000+", min: "2000", max: "" },
];

/** Filter controls that write to the URL; the server page reads them. */
export function PlayersFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`/players?${next.toString()}`);
  };

  const radius = params.get("radius") ?? "25";
  const tc = params.get("tc") ?? "";
  const availability = params.get("availability") ?? "";
  const activeWeek = params.get("active") === "1";
  const min = params.get("min") ?? "";
  const max = params.get("max") ?? "";

  const pill = (active: boolean) =>
    cn(
      "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground",
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RADII.map((r) => (
          <button
            key={r}
            className={pill(radius === String(r))}
            onClick={() => set({ radius: String(r) })}
          >
            {r} km
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {RATING_BANDS.map((b) => (
          <button
            key={b.label}
            className={pill(min === b.min && max === b.max)}
            onClick={() => set({ min: b.min, max: b.max })}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TIME_CONTROLS.map((t) => (
          <button
            key={t.value}
            className={pill(tc === t.value)}
            onClick={() => set({ tc: tc === t.value ? null : t.value })}
          >
            {t.label}
          </button>
        ))}
        <button
          className={pill(availability === "visiting")}
          onClick={() =>
            set({ availability: availability === "visiting" ? null : "visiting" })
          }
        >
          Visiting
        </button>
        <button
          className={pill(activeWeek)}
          onClick={() => set({ active: activeWeek ? null : "1" })}
        >
          Active this week
        </button>
      </div>
    </div>
  );
}
