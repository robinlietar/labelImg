"use client";

import { useTransition } from "react";
import { setPlaceStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export type PendingPlace = {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  source: string;
  source_url: string | null;
  confidence: number | null;
};

export function PendingPlaceRow({ place }: { place: PendingPlace }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{place.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {place.kind} · {place.source}
          {place.confidence != null ? ` · ${place.confidence}` : ""}
          {place.source_url ? (
            <>
              {" · "}
              <a href={place.source_url} className="text-primary underline">
                source
              </a>
            </>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(() => setPlaceStatus(place.id, "approved"))}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(() => setPlaceStatus(place.id, "rejected"))}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
