import type { Candidate, CityRow } from "./types";
import type { PlaceKind } from "@/lib/places";

// Main instance plus a mirror: overpass-api.de sheds load from cloud IPs
// often enough that a single endpoint means whole runs find nothing.
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = `ChessMates/0.1 (${process.env.NEXT_PUBLIC_SITE_URL ?? "https://woodpushers.vercel.app"})`;

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

  let res: Response | null = null;
  let lastError = "";
  for (const url of OVERPASS_URLS) {
    try {
      const attempt = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(25_000),
      });
      if (attempt.ok) {
        res = attempt;
        break;
      }
      lastError = `overpass ${attempt.status} (${new URL(url).hostname})`;
    } catch (e) {
      lastError = `overpass ${(e as Error).name === "TimeoutError" ? "timeout" : (e as Error).message} (${new URL(url).hostname})`;
    }
  }
  if (!res) throw new Error(lastError || "overpass unreachable");

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
