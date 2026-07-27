"use client";

import { useState, useTransition } from "react";
import { updatePlace, geocodeAddress } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLACE_KINDS, KIND_LABEL, type PlaceKind } from "@/lib/places";
import { cn } from "@/lib/utils";
import { ChevronDown, MapPin } from "lucide-react";

export type AdminPlace = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  address: string | null;
  website: string | null;
  opening_notes: string | null;
  source: string;
  source_url: string | null;
  confidence: number | null;
  status: string;
  city_name: string | null;
  lng: number;
  lat: number;
  created_at: string;
};

/** Labeled field wrapper so every admin input says what it is. */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "approved" && "bg-primary/15 text-primary",
        status === "pending" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        status === "rejected" && "bg-destructive/10 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

/**
 * Place editor for the admin queues: a digestible summary row that expands
 * into the full labeled form. Address lookups fill lat/lng in one tap.
 */
export function EditablePlaceCard({
  place,
  startOpen = false,
}: {
  place: AdminPlace;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [name, setName] = useState(place.name);
  const [kind, setKind] = useState(place.kind);
  const [address, setAddress] = useState(place.address ?? "");
  const [website, setWebsite] = useState(place.website ?? "");
  const [description, setDescription] = useState(place.description ?? "");
  const [openingNotes, setOpeningNotes] = useState(place.opening_notes ?? "");
  const [lat, setLat] = useState(String(place.lat.toFixed(5)));
  const [lng, setLng] = useState(String(place.lng.toFixed(5)));
  const [looking, setLooking] = useState(false);

  function lookup() {
    if (!address.trim()) return;
    setLooking(true);
    setNote(null);
    start(async () => {
      const g = await geocodeAddress(address);
      setLooking(false);
      if (g) {
        setLat(g.lat.toFixed(5));
        setLng(g.lng.toFixed(5));
        setNote("Coordinates found from the address. Check the map link, then save.");
      } else {
        setNote("Address did not geocode. Refine it or set lat/lng manually.");
      }
    });
  }

  function save(status?: "approved" | "rejected") {
    start(async () => {
      const latN = Number(lat);
      const lngN = Number(lng);
      const coordsChanged =
        Math.abs(latN - place.lat) > 1e-6 || Math.abs(lngN - place.lng) > 1e-6;
      const res = await updatePlace(
        place.id,
        {
          name,
          kind,
          address,
          website,
          description,
          opening_notes: openingNotes,
          status,
          lat: coordsChanged && Number.isFinite(latN) ? latN : null,
          lng: coordsChanged && Number.isFinite(lngN) ? lngN : null,
        },
        address !== (place.address ?? ""),
      );
      setNote(
        res.ok
          ? (res.error ?? (status ? `Saved and ${status}.` : "Saved."))
          : (res.error ?? "Failed."),
      );
    });
  }

  return (
    <div className="rounded-xl border border-border">
      {/* Digestible summary row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">
              {KIND_LABEL[(kind as PlaceKind)] ?? kind}
            </span>
            <StatusChip status={place.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {place.city_name ?? "no city"} · {address || "no address"} ·{" "}
            {place.source}
            {place.confidence != null && ` · conf ${place.confidence}`}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Kind">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {PLACE_KINDS.map((k: PlaceKind) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
            </Field>
            <Field label="Address" className="md:col-span-2">
              <div className="flex gap-2">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || looking || !address.trim()}
                  onClick={lookup}
                  className="shrink-0"
                >
                  <MapPin className="h-4 w-4" />
                  {looking ? "Looking..." : "Get lat/lng"}
                </Button>
              </div>
            </Field>
            <Field label="Latitude">
              <Input value={lat} onChange={(e) => setLat(e.target.value)} />
            </Field>
            <Field label="Longitude">
              <div className="flex gap-2">
                <Input value={lng} onChange={(e) => setLng(e.target.value)} />
                <a
                  href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-11 shrink-0 place-items-center rounded-lg border border-border px-3 text-xs"
                >
                  map
                </a>
              </div>
            </Field>
            <Field label="Website">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <Field label="When people play (opening notes)">
              <Input
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
              />
            </Field>
            <Field label="One-line description" className="md:col-span-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">
            {place.source_url && (
              <a
                href={place.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                View source
              </a>
            )}
          </div>

          {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => save()}>
              Save
            </Button>
            {place.status !== "approved" && (
              <Button size="sm" disabled={pending} onClick={() => save("approved")}>
                Save and approve
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => save("rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
