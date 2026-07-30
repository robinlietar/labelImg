import { createServiceClient } from "@/lib/supabase/service";
import {
  googleEnabled,
  searchPlaces,
  placeDetails,
  fetchPhoto,
  bestMatch,
} from "@/lib/google-places";
import { haversineMeters, nameSimilarity } from "@/lib/geo";
import { safeHttpUrl } from "@/lib/utils";

export type EnrichResult = {
  enabled: boolean;
  processed: number;
  matched: number;
  photos: number;
  budget_hit: boolean;
};

type PlaceRow = {
  id: string;
  name: string;
  address: string | null;
  website: string | null;
  google_place_id: string | null;
  photo_url: string | null;
  lng: number;
  lat: number;
  city_name: string | null;
};

const STALE_DAYS = 30;

/**
 * Enrich approved places from Google Places: exact coordinates, rating,
 * photo, opening hours, phone, Google Maps link. Never-enriched places go
 * first, then anything older than STALE_DAYS. Every place touched gets
 * google_refreshed_at stamped, match or not, so a miss is retried monthly
 * instead of nightly. Stops early when the monthly API budget runs out.
 */
export async function enrichPlaces(
  limit: number,
  deadlineMs?: number,
): Promise<EnrichResult> {
  const result: EnrichResult = {
    enabled: googleEnabled(),
    processed: 0,
    matched: 0,
    photos: 0,
    budget_hit: false,
  };
  if (!result.enabled) return result;

  const svc = createServiceClient();
  const staleBefore = new Date(
    Date.now() - STALE_DAYS * 86400000,
  ).toISOString();
  const { data } = await svc.rpc("places_to_enrich", {
    p_stale_before: staleBefore,
    p_limit: limit,
  });
  const rows = (data ?? []) as PlaceRow[];

  for (const row of rows) {
    if (deadlineMs && Date.now() > deadlineMs - 20_000) break;
    result.processed++;

    // Resolve the Google place id once; it is stable afterwards.
    let googleId = row.google_place_id;
    if (!googleId) {
      const query = [row.name, row.address ?? row.city_name]
        .filter(Boolean)
        .join(", ");
      const found = await searchPlaces(
        svc,
        query,
        { lat: row.lat, lng: row.lng, radiusMeters: 20_000 },
        5,
      );
      if (found.length === 0) {
        // Budget exhausted looks identical to no results; probe cheaply by
        // checking enabled state only once more places keep failing.
        result.budget_hit = true;
      }
      const match = bestMatch(
        found,
        row.name,
        { lat: row.lat, lng: row.lng },
        nameSimilarity,
        haversineMeters,
      );
      googleId = match?.id ?? null;
    }

    if (!googleId) {
      await svc
        .from("places")
        .update({ google_refreshed_at: new Date().toISOString() })
        .eq("id", row.id);
      continue;
    }

    const details = await placeDetails(svc, googleId);
    if (!details) {
      // Details budget gone: stop the whole run, do not stamp the place so
      // it is first in line next run.
      result.budget_hit = true;
      break;
    }

    const updates: Record<string, unknown> = {
      google_place_id: googleId,
      google_refreshed_at: new Date().toISOString(),
      rating: details.rating ?? null,
      rating_count: details.userRatingCount ?? null,
      phone: details.internationalPhoneNumber ?? null,
      gmaps_url: safeHttpUrl(details.googleMapsUri),
      business_status: details.businessStatus ?? null,
      opening_hours: details.regularOpeningHours
        ? {
            weekday: details.regularOpeningHours.weekdayDescriptions ?? null,
            periods: details.regularOpeningHours.periods ?? null,
            utc_offset_minutes: details.utcOffsetMinutes ?? null,
          }
        : null,
    };
    if (details.formattedAddress && !row.address) {
      updates.address = details.formattedAddress;
    }
    if (!row.website && details.websiteUri) {
      updates.website = safeHttpUrl(details.websiteUri);
    }

    // One photo per place, fetched once and stored in our own bucket.
    if (!row.photo_url && details.photos?.[0]?.name) {
      const photo = await fetchPhoto(svc, details.photos[0].name);
      if (photo) {
        const path = `${row.id}.jpg`;
        const { error: upErr } = await svc.storage
          .from("place-photos")
          .upload(path, photo.bytes, {
            contentType: photo.contentType,
            upsert: true,
          });
        if (!upErr) {
          updates.photo_url = svc.storage
            .from("place-photos")
            .getPublicUrl(path).data.publicUrl;
          result.photos++;
        }
      }
    }

    await svc.from("places").update(updates).eq("id", row.id);

    // Google's pin beats a geocoded or hand-placed one when they disagree
    // by more than a street's width.
    if (details.location) {
      const gp = { lat: details.location.latitude, lng: details.location.longitude };
      if (haversineMeters({ lat: row.lat, lng: row.lng }, gp) > 40) {
        await svc.rpc("set_place_location", {
          p_id: row.id,
          p_lng: gp.lng,
          p_lat: gp.lat,
        });
      }
    }
    result.matched++;
  }
  return result;
}
