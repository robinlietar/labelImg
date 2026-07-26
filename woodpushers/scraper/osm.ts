import type { Candidate, CityRow } from "./types";
import type { PlaceKind } from "@/lib/places";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Chess in many languages, matched against venue names.
const NAME_REGEX = "chess|schach|échecs|echecs|ajedrez|xadrez|szachy|satranç|шахмат";

/** Search radius in metres, scaled by city size. */
export function cityRadiusMeters(population: number | null): number {
  const p = population ?? 0;
  if (p > 5_000_000) return 25_000;
  if (p > 1_000_000) return 18_000;
  if (p > 300_000) return 12_000;
  return 8_000;
}

function mapKind(tags: Record<string, string>): PlaceKind {
  if (tags.club === "chess" || tags.sport === "chess") return "club";
  switch (tags.amenity) {
    case "cafe":
      return "cafe";
    case "bar":
    case "pub":
      return "bar";
    case "community_centre":
      return "community_center";
    case "library":
      return "library";
    default:
      return "other";
  }
}

type OverpassElement = {
  type: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Query OSM via Overpass for chess venues near a city. One query per city. */
export async function fetchOsm(city: CityRow): Promise<Candidate[]> {
  const r = cityRadiusMeters(city.population);
  const c = `${r},${city.lat},${city.lng}`;
  const query = `
    [out:json][timeout:60];
    (
      nwr(around:${c})[sport=chess];
      nwr(around:${c})[club=chess];
      nwr(around:${c})[amenity~"^(cafe|bar|pub|community_centre|library)$"][name~"${NAME_REGEX}",i];
    );
    out center tags;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (res.status === 429) throw new Error("overpass rate limited");
  if (!res.ok) throw new Error(`overpass ${res.status}`);

  const json = (await res.json()) as { elements: OverpassElement[] };
  const out: Candidate[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    out.push({
      name,
      kind: mapKind(tags),
      address:
        [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
          .filter(Boolean)
          .join(" ") || null,
      website: tags.website ?? tags["contact:website"] ?? null,
      lat,
      lng: lon,
      source: "osm",
      source_url: `https://www.openstreetmap.org/${el.type}/${el.id ?? ""}`,
      confidence: 0.9,
    });
  }
  return out;
}
