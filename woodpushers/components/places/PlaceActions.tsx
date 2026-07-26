"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Flag } from "lucide-react";

/** "I play here" and "report a problem" for a place detail page. */
export function PlaceActions({ placeId }: { placeId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function outcome(res: Response, okMsg: string): string {
    if (res.ok) return okMsg;
    if (res.status === 401) return "Sign in first.";
    return "Something went wrong, try again.";
  }

  async function iPlayHere() {
    setBusy(true);
    try {
      const res = await fetch("/api/place-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      setNote(outcome(res, "Noted, thanks. This helps us rank places."));
    } catch {
      setNote("Network problem, try again.");
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    const reason = window.prompt("What is wrong with this listing?") ?? "";
    if (!reason) return;
    setBusy(true);
    try {
      const res = await fetch("/api/place-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, reason: reason.slice(0, 1000) }),
      });
      setNote(outcome(res, "Thanks, we will take a look."));
    } catch {
      setNote("Network problem, try again.");
    } finally {
      setBusy(false);
    }
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
