"use client";

import { useState, useTransition } from "react";
import { updatePlace } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLACE_KINDS, KIND_LABEL, type PlaceKind } from "@/lib/places";

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

/** Full-detail editable place card for the admin queues and place search. */
export function EditablePlaceCard({ place }: { place: AdminPlace }) {
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
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {place.city_name ?? "no city"} · {place.source}
          {place.confidence != null && ` · conf ${place.confidence}`}
          {" · "}
          <span
            className={
              place.status === "approved"
                ? "text-primary"
                : place.status === "rejected"
                  ? "text-destructive"
                  : ""
            }
          >
            {place.status}
          </span>
        </span>
        {place.source_url && (
          <a
            href={place.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-primary underline"
          >
            source
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-11 rounded-lg border border-input bg-background px-2 text-sm"
          >
            {PLACE_KINDS.map((k: PlaceKind) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
        <div className="flex gap-2">
          <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
          <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 shrink-0 place-items-center rounded-lg border border-border px-3 text-xs"
          >
            map
          </a>
        </div>
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website" />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One-line description"
        />
        <Input
          value={openingNotes}
          onChange={(e) => setOpeningNotes(e.target.value)}
          placeholder="When people play (opening notes)"
        />
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
  );
}
