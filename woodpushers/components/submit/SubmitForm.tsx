"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLACE_KINDS, KIND_LABEL } from "@/lib/places";

type Result = { status: "published" | "in_review" } | null;

export function SubmitForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name") ?? ""),
      kind: String(f.get("kind") ?? "other"),
      address: String(f.get("address") ?? "") || null,
      website: String(f.get("website") ?? "") || null,
      when_notes: String(f.get("when_notes") ?? "") || null,
      notes: String(f.get("notes") ?? "") || null,
    };
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Something went wrong");
    setResult({ status: json.status });
  }

  if (result) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-lg font-medium">
          {result.status === "published" ? "Published, thank you" : "Sent for review"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.status === "published"
            ? "It is on the map now."
            : "We will check it shortly and add it if it checks out."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Place name</Label>
        <Input id="name" name="name" required placeholder="Marrickville Chess Club" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Kind</Label>
        <select
          id="kind"
          name="kind"
          className="h-11 rounded-lg border border-input bg-background px-3 text-base"
          defaultValue="club"
        >
          {PLACE_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Street, suburb, city" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="when_notes">When do people play there?</Label>
        <Input id="when_notes" name="when_notes" placeholder="Tuesday evenings, weekends" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Anything else</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="rounded-lg border border-input bg-background px-3 py-2 text-base"
          placeholder="Casual games, boards provided, ask at the bar..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Checking..." : "Submit place"}
      </Button>
    </form>
  );
}
