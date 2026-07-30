import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { MiniMap } from "@/components/map/MiniMap";
import { PlaceActions } from "@/components/places/PlaceActions";
import { FavoriteButton } from "@/components/places/FavoriteButton";
import { ShareButton } from "@/components/ShareButton";
import { KIND_LABEL, type PlaceKind } from "@/lib/places";
import { isOpenNow, type StoredHours } from "@/lib/hours";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

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
  rating: number | null;
  rating_count: number | null;
  phone: string | null;
  gmaps_url: string | null;
  photo_url: string | null;
  opening_hours: StoredHours | null;
  favorites: number;
  is_favorite: boolean;
};

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, user] = await Promise.all([
    supabase.rpc("place_detail", { p_id: id }),
    getUser(),
  ]);
  const place = (data?.[0] ?? null) as Detail | null;
  if (!place) notFound();

  const directions =
    place.gmaps_url ??
    `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  const open = isOpenNow(place.opening_hours);
  const weekday = place.opening_hours?.weekday ?? null;
  // Google's weekday list starts on Monday; JS getDay() has Sunday at 0.
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Map
      </Link>

      {place.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={place.photo_url}
          alt=""
          className="mt-4 h-44 w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {KIND_LABEL[place.kind]}
          </p>
          <h1 className="text-2xl font-semibold">{place.name}</h1>
          {place.city_slug && (
            <Link href={`/city/${place.city_slug}`} className="text-sm text-muted-foreground underline">
              {place.city_name}
            </Link>
          )}
        </div>
        <FavoriteButton
          placeId={place.id}
          initialOn={place.is_favorite}
          initialCount={place.favorites}
          signedIn={!!user}
        />
      </div>

      {(place.rating != null || open != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {place.rating != null && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{Number(place.rating).toFixed(1)}</span>
              {place.rating_count != null && (
                <span className="text-muted-foreground">
                  ({place.rating_count} Google reviews)
                </span>
              )}
            </span>
          )}
          {open === true && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Open now
            </span>
          )}
          {open === false && (
            <span className="text-muted-foreground">Closed right now</span>
          )}
        </div>
      )}

      <div className="mt-4">
        <MiniMap
          center={{ lng: place.lng, lat: place.lat }}
          markers={[{ id: place.id, lng: place.lng, lat: place.lat }]}
        />
      </div>

      {place.description && (
        <p className="mt-4 select-text text-sm">{place.description}</p>
      )}
      {place.address && (
        <p className="mt-3 select-text text-sm text-muted-foreground">{place.address}</p>
      )}
      {place.opening_notes && (
        <p className="mt-2 text-sm text-muted-foreground">
          When: {place.opening_notes}
        </p>
      )}

      {weekday && weekday.length > 0 && (
        <details className="mt-3 rounded-lg border border-border px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Opening hours
            <span className="ml-auto text-xs text-muted-foreground">
              {weekday[todayIdx]?.split(": ")[1] ?? ""}
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {weekday.map((line, i) => (
              <li
                key={line}
                className={i === todayIdx ? "font-medium" : "text-muted-foreground"}
              >
                {line}
              </li>
            ))}
          </ul>
        </details>
      )}

      {place.signals > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {place.signals} {place.signals === 1 ? "person plays" : "people play"} here
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <a href={directions} target="_blank" rel="noopener noreferrer" className="flex-1">
          <span className="flex h-11 items-center justify-center gap-1 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
            <MapPin className="h-4 w-4" /> Directions
          </span>
        </a>
        {place.phone && (
          <a
            href={`tel:${place.phone.replace(/\s+/g, "")}`}
            className="grid h-11 w-11 place-items-center rounded-lg border border-border"
            aria-label={`Call ${place.phone}`}
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
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
