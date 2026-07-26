/** Geo helpers shared by the map, the scraper, and privacy rounding. */

export const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres between two lng/lat points. */
export function haversineMeters(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Coarsen a coordinate for privacy. Rounds to ~0.02 degrees (roughly 2 km),
 * so a stored profile location can never pinpoint a home.
 */
export function coarsen(
  lng: number,
  lat: number,
  step = 0.02,
): { lng: number; lat: number } {
  const round = (v: number) => Math.round(v / step) * step;
  return { lng: round(lng), lat: round(lat) };
}

/** Postgis WKT point (lng lat order) for insert. */
export function pointWkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** Slugify a city name into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalize a place name for fuzzy dedupe: lowercase, strip accents,
 * punctuation, and common venue words.
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(the|le|la|les|el|club|de|du|des|chess|cafe|bar)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Token-set similarity in [0,1] for two normalized names. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

/** Registrable-ish domain from a URL, for same-site dedupe. */
export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const h = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return h.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
