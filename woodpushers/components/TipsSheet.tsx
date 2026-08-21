"use client";

import { useEffect, useState } from "react";
import { MapPin, Users, Plus, Heart } from "lucide-react";

const SEEN_KEY = "cm:tips-seen";

/**
 * One-time getting-started card for first visits. Dismiss persists in
 * localStorage; nothing is ever shown again after "Got it".
 */
export function TipsSheet() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {
      /* storage unavailable: stay hidden */
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* fine */
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 px-3">
      <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
        <p className="text-base font-semibold">Welcome to ChessNow</p>
        <ul className="mt-3 flex flex-col gap-2.5 text-sm">
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Every pin is a real place to play. Tap one for hours, directions
              and who plays there. The Open now filter shows what is live.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              The Players tab shows people near you who want a game. Propose
              one, and follow your mates from their profile to keep them.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Know a spot that is missing? The + button on the map adds it,
              and a <Heart className="inline h-3.5 w-3.5 fill-red-500 text-red-500" />{" "}
              on a place saves it to your favorites.
            </span>
          </li>
        </ul>
        <button
          onClick={dismiss}
          className="mt-4 h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground"
        >
          Got it, show me the map
        </button>
      </div>
    </div>
  );
}
