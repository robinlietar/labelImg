import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MiniMap } from "@/components/map/MiniMap";
import { PlaceActions } from "@/components/places/PlaceActions";
import { ShareButton } from "@/components/ShareButton";
import { KIND_LABEL, type PlaceKind } from "@/lib/places";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";

type Detail = {
  id: string;
  name: string;
  kind: PlaceKind;
  description: string | null;
  address: string | null;
  website: string | null;
  opening_notes: string | null;
  source: string;
  source_url: string | null;
  lng: number;
  lat: number;
  city_slug: string | null;
  city_name: string | null;
  signals: number;
};

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("place_detail", { p_id: id });
  const place = (data?.[0] ?? null) as Detail | null;
  if (!place) notFound();

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Map
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-primary">
        {KIND_LABEL[place.kind]}
      </p>
      <h1 className="text-2xl font-semibold">{place.name}</h1>
      {place.city_slug && (
        <Link href={`/city/${place.city_slug}`} className="text-sm text-muted-foreground underline">
          {place.city_name}
        </Link>
      )}

      <div className="mt-4">
        <MiniMap
          center={{ lng: place.lng, lat: place.lat }}
          markers={[{ id: place.id, lng: place.lng, lat: place.lat }]}
        />
      </div>

      {place.description && <p className="mt-4 text-sm">{place.description}</p>}
      {place.address && (
        <p className="mt-3 text-sm text-muted-foreground">{place.address}</p>
      )}
      {place.opening_notes && (
        <p className="mt-2 text-sm text-muted-foreground">
          When: {place.opening_notes}
        </p>
      )}
      {place.signals > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {place.signals} {place.signals === 1 ? "person plays" : "people play"} here
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <a href={directions} target="_blank" rel="noopener noreferrer" className="flex-1">
          <span className="flex h-11 items-center justify-center gap-1 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
            <MapPin className="h-4 w-4" /> Directions
          </span>
        </a>
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-11 w-11 place-items-center rounded-lg border border-border"
            aria-label="Website"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-4">
        <PlaceActions placeId={place.id} />
      </div>

      <div className="mt-3">
        <ShareButton
          title={place.name}
          text={`Chess spot: ${place.name}. Fancy a game there?`}
          path={`/place/${place.id}`}
          label="Share this place"
          variant="ghost"
          className="w-full text-muted-foreground"
        />
      </div>
    </main>
  );
}
