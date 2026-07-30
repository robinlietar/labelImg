import type { SupabaseClient } from "@supabase/supabase-js";
import { googleEnabled, searchPlaces } from "@/lib/google-places";
import type { PlaceKind } from "@/lib/places";
import type { Candidate, CityRow } from "./types";
import { cityRadiusMeters } from "./osm";

// "chess" across the languages of the launch markets.
const CHESSY =
  /chess|schach|échec|echec|ajedrez|xadrez|szachy|satranç|шахмат|skak|sjakk|šach|sakk|scacchi|schaak/i;

const QUERIES: Array<{ q: string; kind: PlaceKind }> = [
  { q: "chess club", kind: "club" },
  { q: "chess cafe", kind: "cafe" },
];

function kindFromTypes(
  types: string[] | undefined,
  fallback: PlaceKind,
): PlaceKind {
  const t = new Set(types ?? []);
  if (t.has("cafe") || t.has("coffee_shop")) return "cafe";
  if (t.has("bar") || t.has("pub")) return "bar";
  if (t.has("library")) return "library";
  if (t.has("park")) return "park";
  if (t.has("community_center")) return "community_center";
  return fallback;
}

/**
 * Google Places discovery: two text searches per city, kept only when the
 * venue name itself mentions chess (a generic cafe ranking for the query is
 * noise). Cheap by construction: budget-guarded and ~2 calls per city.
 */
export async function fetchGoogle(
  svc: SupabaseClient,
  city: CityRow,
): Promise<Candidate[]> {
  if (!googleEnabled()) return [];
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const radiusMeters = cityRadiusMeters(city.population);

  for (const { q, kind } of QUERIES) {
    const results = await searchPlaces(
      svc,
      `${q} in ${city.name}`,
      { lat: city.lat, lng: city.lng, radiusMeters },
      10,
    );
    for (const r of results) {
      const name = r.displayName?.text;
      if (!name || !r.location || seen.has(r.id)) continue;
      if (!CHESSY.test(name)) continue;
      seen.add(r.id);
      out.push({
        name,
        kind: kindFromTypes(r.types, kind),
        address: r.formattedAddress ?? null,
        lat: r.location.latitude,
        lng: r.location.longitude,
        source: "google",
        source_url: `https://www.google.com/maps/place/?q=place_id:${r.id}`,
        confidence: 0.75, // real venue, but chess activity unverified: review queue
        google_place_id: r.id,
      });
    }
  }
  return out;
}
