"use client";

import Link from "next/link";
import { KIND_LABEL, SOURCE_LABEL, type PlacePoint } from "@/lib/places";
import { ExternalLink, MapPin, X } from "lucide-react";

/** Bottom sheet shown when a map marker is tapped. */
export function PlaceSheet({
  place,
  onClose,
}: {
  place: PlacePoint | null;
  onClose: () => void;
}) {
  if (!place) return null;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    <div className="absolute inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-20 p-3">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          {place.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.photo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {KIND_LABEL[place.kind]}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold leading-tight">
              {place.name}
            </h2>
            {place.address && (
              <p className="mt-1 text-sm text-muted-foreground">
                {place.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5">
            {SOURCE_LABEL[place.source]}
          </span>
          {place.rating != null && (
            <span className="rounded-full bg-secondary px-2 py-0.5">
              ★ {Number(place.rating).toFixed(1)}
            </span>
          )}
          {place.open_now === true && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              Open now
            </span>
          )}
          {place.open_now === false && (
            <span className="rounded-full bg-secondary px-2 py-0.5">Closed</span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/place/${place.id}`}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium"
          >
            Details
          </Link>
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            <MapPin className="h-4 w-4" /> Directions
          </a>
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Website"
              className="grid w-11 place-items-center rounded-lg border border-border"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
