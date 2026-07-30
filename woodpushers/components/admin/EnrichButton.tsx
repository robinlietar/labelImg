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
            // An empty queue triggers ONE retry pass over places that had no
            // Google match before (normally retried monthly).
            let matched = 0;
            let photos = 0;
            let didRetry = false;
            let wantRetry = false;
            let unmatched = 0;
            for (let pass = 0; pass < 25; pass++) {
              try {
                const res = await fetch("/api/admin/enrich", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ retryUnmatched: wantRetry }),
                });
                wantRetry = false;
                const json = (await res.json()) as {
                  enabled?: boolean;
                  processed?: number;
                  matched?: number;
                  photos?: number;
                  budget_hit?: boolean;
                  first_error?: string | null;
                  unmatched?: number;
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
                unmatched = json.unmatched ?? unmatched;
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
                if (!json.processed) {
                  if (didRetry) break; // genuinely nothing left to try
                  // Queue empty: retry places that had no Google match once.
                  didRetry = true;
                  wantRetry = true;
                  setLast("Retrying places without a Google match...");
                  continue;
                }
                setLast(`Working... ${matched} enriched, ${photos} photos so far`);
              } catch {
                toast("Enrichment failed, try again.", "error");
                return;
              }
            }
            const msg =
              matched === 0
                ? `Everything is enriched. ${unmatched} ${unmatched === 1 ? "place has" : "places have"} no Google listing (retried monthly).`
                : `All done: ${matched} enriched, ${photos} photos. ${unmatched} without a Google listing.`;
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
