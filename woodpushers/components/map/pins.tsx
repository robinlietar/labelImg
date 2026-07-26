"use client";

import type { ComponentType } from "react";
import {
  Beer,
  BookOpen,
  Castle,
  Coffee,
  Landmark,
  MapPin,
  ShoppingBag,
  Trees,
  Trophy,
} from "lucide-react";
import type { PlaceKind } from "@/lib/places";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<PlaceKind, ComponentType<{ className?: string }>> = {
  club: Castle,
  cafe: Coffee,
  bar: Beer,
  park: Trees,
  library: BookOpen,
  community_center: Landmark,
  tournament_venue: Trophy,
  shop: ShoppingBag,
  other: MapPin,
};

/** Teardrop place pin: brand-green disc, white kind icon, small tail. */
export function PlacePin({
  kind,
  selected,
  label,
}: {
  kind: PlaceKind;
  selected?: boolean;
  label: string;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <span
      aria-label={label}
      className={cn(
        "block -translate-y-1/2 transition-transform duration-150",
        selected ? "scale-125" : "hover:scale-110",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]",
          selected ? "bg-[#1d4030]" : "bg-[#2a5c43]",
        )}
      >
        <Icon className="h-4 w-4 text-white" />
      </span>
      <span
        className={cn(
          "mx-auto -mt-[3px] block h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent drop-shadow",
          selected ? "border-t-[#1d4030]" : "border-t-[#2a5c43]",
        )}
      />
    </span>
  );
}

/** Cluster bubble: count-scaled green disc with a soft halo. */
export function ClusterBubble({ count }: { count: number }) {
  const size = Math.min(30 + Math.round(Math.log2(count + 1) * 7), 58);
  return (
    <span
      className="grid place-items-center rounded-full bg-[#2a5c43]/25"
      style={{ width: size + 14, height: size + 14 }}
    >
      <span
        className="grid place-items-center rounded-full border-2 border-white bg-[#2a5c43] text-sm font-semibold text-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
        style={{ width: size, height: size }}
      >
        {count}
      </span>
    </span>
  );
}
