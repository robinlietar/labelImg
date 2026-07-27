"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toaster";
import { relTime } from "@/lib/time";
import { RefreshCw } from "lucide-react";

/** Last-synced line with a one-tap resync for linked chess accounts. */
export function SyncStatus({ lastSynced }: { lastSynced: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resync() {
    setBusy(true);
    try {
      const res = await fetch("/api/refresh-ratings", { method: "POST" });
      if (!res.ok) throw new Error();
      toast("Ratings synced");
      router.refresh();
    } catch {
      toast("Sync failed, try again", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        {(() => {
          if (!lastSynced) return "Ratings sync nightly and on login";
          const t = relTime(lastSynced);
          if (t === "now") return "Ratings synced just now";
          return /^\d+[mhd]$/.test(t)
            ? `Ratings synced ${t} ago`
            : `Ratings synced ${t}`;
        })()}
      </span>
      <Button size="sm" variant="ghost" onClick={resync} disabled={busy}>
        <RefreshCw className={busy ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {busy ? "Syncing..." : "Resync"}
      </Button>
    </div>
  );
}
