"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Flag } from "lucide-react";

/** "I play here" and "report a problem" for a place detail page. */
export function PlaceActions({ placeId }: { placeId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function iPlayHere() {
    setBusy(true);
    const res = await fetch("/api/place-signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    setBusy(false);
    setNote(res.ok ? "Noted, thanks. This helps us rank places." : "Sign in first.");
  }

  async function report() {
    const reason = window.prompt("What is wrong with this listing?") ?? "";
    if (!reason) return;
    setBusy(true);
    const res = await fetch("/api/place-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, reason }),
    });
    setBusy(false);
    setNote(res.ok ? "Thanks, we will take a look." : "Sign in first.");
  }

  return (
    <div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={iPlayHere} disabled={busy}>
          <CheckCircle2 className="h-4 w-4" /> I play here
        </Button>
        <Button variant="ghost" onClick={report} disabled={busy} aria-label="Report a problem">
          <Flag className="h-4 w-4" /> Report
        </Button>
      </div>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
