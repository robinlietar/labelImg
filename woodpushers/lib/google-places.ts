import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Google Places API (New) client with a hard monthly budget.
 *
 * Cost model: every billable call first reserves a slot in the api_usage
 * table via bump_api_usage. When a month's cap is reached, calls return null
 * until the next month. Caps sit inside Google's free per-SKU monthly
 * allowances (Essentials 10k, Pro 5k, Enterprise 1k as of 2025), so the
 * steady-state bill is zero even before the key's own quota limits kick in.
 */
const CAPS = {
  text_search: 3500, // Pro tier free allowance is 5k/month
  details: 850, // Enterprise tier free allowance is 1k/month
  photo: 850,
} as const;
type UsageKind = keyof typeof CAPS;

const BASE = "https://places.googleapis.com/v1";

export function googleEnabled(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

async function allow(svc: SupabaseClient, kind: UsageKind): Promise<boolean> {
  const { data, error } = await svc.rpc("bump_api_usage", {
    p_kind: kind,
    p_cap: CAPS[kind],
  });
  // Fail closed: no budget table means no spend.
  return !error && data === true;
}

export type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: Array<{
      open?: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
  utcOffsetMinutes?: number;
  businessStatus?: string;
  photos?: Array<{ name: string }>;
};

const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
].join(",");

const DETAILS_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "internationalPhoneNumber",
  "googleMapsUri",
  "websiteUri",
  "regularOpeningHours.weekdayDescriptions",
  "regularOpeningHours.periods",
  "utcOffsetMinutes",
  "businessStatus",
  "photos.name",
].join(",");

/**
 * Text search (Pro field mask). Returns [] on budget exhaustion or any API
 * problem: enrichment must degrade to nothing, never crash a run.
 */
export async function searchPlaces(
  svc: SupabaseClient,
  query: string,
  bias?: { lat: number; lng: number; radiusMeters?: number },
  maxResults = 5,
): Promise<GooglePlace[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  if (!(await allow(svc, "text_search"))) return [];
  try {
    const body: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: Math.min(maxResults, 10),
    };
    if (bias) {
      body.locationBias = {
        circle: {
          center: { latitude: bias.lat, longitude: bias.lng },
          radius: Math.min(bias.radiusMeters ?? 15_000, 50_000),
        },
      };
    }
    const res = await fetch(`${BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": SEARCH_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { places?: GooglePlace[] };
    return json.places ?? [];
  } catch {
    return [];
  }
}

/** Full details for one place (Enterprise field mask, tightest budget). */
export async function placeDetails(
  svc: SupabaseClient,
  googlePlaceId: string,
): Promise<GooglePlace | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  if (!(await allow(svc, "details"))) return null;
  try {
    const res = await fetch(`${BASE}/places/${googlePlaceId}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": DETAILS_MASK },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as GooglePlace;
  } catch {
    return null;
  }
}

/**
 * Download one photo (<=800px wide). Fetched once per place at enrichment
 * time and stored in Supabase Storage, never proxied per page view.
 */
export async function fetchPhoto(
  svc: SupabaseClient,
  photoName: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  if (!(await allow(svc, "photo"))) return null;
  try {
    const res = await fetch(
      `${BASE}/${photoName}/media?maxWidthPx=800&key=${key}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    return {
      bytes: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    return null;
  }
}

/** Pick the search result that plausibly IS the given venue, or null. */
export function bestMatch(
  results: GooglePlace[],
  name: string,
  near: { lat: number; lng: number } | null,
  similarity: (a: string, b: string) => number,
  haversineMeters: (
    a: { lng: number; lat: number },
    b: { lng: number; lat: number },
  ) => number,
): GooglePlace | null {
  let best: GooglePlace | null = null;
  let bestScore = 0;
  for (const r of results) {
    const rName = r.displayName?.text ?? "";
    if (!rName || !r.location) continue;
    const sim = similarity(name, rName);
    const dist = near
      ? haversineMeters(near, {
          lat: r.location.latitude,
          lng: r.location.longitude,
        })
      : null;
    // Too far away is a different venue with a similar name.
    if (dist != null && dist > 3000) continue;
    const score = sim + (dist != null ? Math.max(0, 0.3 - dist / 10_000) : 0);
    if (sim >= 0.45 && score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}
