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
              if (json.first_error) {
                const msg = `Google error: ${json.first_error}`;
                setLast(msg);
                toast(msg, "error");
                return;
              }
              const msg = `Enriched ${json.matched}/${json.processed} places, ${json.photos} photos${json.budget_hit ? " (monthly budget reached)" : ""}`;
              setLast(msg);
              toast(msg, "success");
              router.refresh();
            } catch {
              toast("Enrichment failed, try again.", "error");
            }
          })
        }
      >
        {pending ? "Enriching..." : "Enrich with Google"}
      </Button>
      {last && <span className="text-xs text-muted-foreground">{last}</span>}
    </span>
  );
}
