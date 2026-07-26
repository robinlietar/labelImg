"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Shown on a city page with no chat yet: records demand for one. */
export function CityChatRequest({ cityId }: { cityId: number }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    const res = await fetch("/api/city-chat-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityId }),
    });
    setBusy(false);
    if (res.ok) setDone(true);
  }

  if (done)
    return (
      <p className="text-sm text-muted-foreground">
        Noted. We start a chat once there is enough interest here.
      </p>
    );

  return (
    <Button variant="outline" onClick={request} disabled={busy} className="w-full">
      {busy ? "..." : "Request a city chat"}
    </Button>
  );
}
