"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";

/** Runs a Google Places enrichment pass over the stalest approved places. */
export function EnrichButton() {
  const [pending, start] = useTransition();
  const [last, setLast] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            // Keep requesting passes until the queue is empty, an error
            // surfaces, or the monthly budget is hit: one tap does them all.
            let matched = 0;
            let photos = 0;
            for (let pass = 0; pass < 25; pass++) {
              try {
                const res = await fetch("/api/admin/enrich", { method: "POST" });
                const json = (await res.json()) as {
                  enabled?: boolean;
                  processed?: number;
                  matched?: number;
                  photos?: number;
                  budget_hit?: boolean;
                  first_error?: string | null;
                  error?: string;
                };
                if (!res.ok) {
                  toast(json.error ?? "Enrichment failed.", "error");
                  return;
                }
                if (!json.enabled) {
                  toast("Add GOOGLE_PLACES_API_KEY in Vercel first.", "error");
                  return;
                }
                matched += json.matched ?? 0;
                photos += json.photos ?? 0;
                if (json.first_error) {
                  const msg = `Google error after ${matched} enriched: ${json.first_error}`;
                  setLast(msg);
                  toast(msg, "error");
                  return;
                }
                if (json.budget_hit) {
                  const msg = `Enriched ${matched} places, ${photos} photos (monthly budget reached)`;
                  setLast(msg);
                  toast(msg, "error");
                  router.refresh();
                  return;
                }
                if (!json.processed) break; // queue empty
                setLast(`Working... ${matched} enriched, ${photos} photos so far`);
              } catch {
                toast("Enrichment failed, try again.", "error");
                return;
              }
            }
            const msg = `All done: ${matched} places enriched, ${photos} photos`;
            setLast(msg);
            toast(msg, "success");
            router.refresh();
          })
        }
      >
        {pending ? "Enriching..." : "Enrich all with Google"}
      </Button>
      {last && <span className="text-xs text-muted-foreground">{last}</span>}
    </span>
  );
}
