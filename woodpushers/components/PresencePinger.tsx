"use client";

import { useEffect } from "react";

const THROTTLE_MS = 5 * 60 * 1000;

/** Pings presence on load and when the tab regains focus, at most every 5 min. */
export function PresencePinger() {
  useEffect(() => {
    let last = 0;
    const ping = () => {
      const now = Date.now();
      if (now - last < THROTTLE_MS) return;
      last = now;
      void fetch("/api/presence", { method: "POST" }).catch(() => {});
    };
    ping();
    const onFocus = () => ping();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") ping();
    });
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return null;
}
