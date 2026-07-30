"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";

/** Optimistic heart toggle. Signed-out taps route to login. */
export function FavoriteButton({
  placeId,
  initialOn,
  initialCount,
  signedIn,
}: {
  placeId: string;
  initialOn: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [count, setCount] = useState(initialCount);
  const router = useRouter();

  const toggle = async () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    const next = !on;
    setOn(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, on: next }),
      });
      if (!res.ok) throw new Error();
      toast(next ? "Added to favorites" : "Removed from favorites");
    } catch {
      // Roll back the optimistic flip.
      setOn(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast("Could not save, try again.", "error");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg p-2"
    >
      <Heart
        className={cn(
          "h-6 w-6 transition-colors",
          on ? "fill-red-500 text-red-500" : "text-muted-foreground",
        )}
      />
      {count > 0 && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
