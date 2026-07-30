import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { canSubmit } from "@/lib/rate-limit";
import { geocode } from "@/lib/nominatim";
import { safeHttpUrl } from "@/lib/utils";
import { PLACE_KINDS } from "@/lib/places";
import { assessSubmission, type NearbyPlace, type SubmissionPayload } from "@/lib/assess";
import { googleEnabled, searchPlaces, bestMatch } from "@/lib/google-places";
import { haversineMeters, nameSimilarity } from "@/lib/geo";

const AUTO_APPROVE = 0.85;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!(await canSubmit(user.id)))
    return NextResponse.json({ error: "You have reached today's submission limit, try again tomorrow." }, { status: 429 });

  let payload: SubmissionPayload;
  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json({ error: "Something went wrong reading the form, try again." }, { status: 400 });
  }
  if (!payload?.name?.trim() || !payload?.kind)
    return NextResponse.json({ error: "Give the place a name and pick a kind." }, { status: 400 });
  if (!(PLACE_KINDS as readonly string[]).includes(payload.kind))
    return NextResponse.json({ error: "Pick a kind from the list." }, { status: 400 });
  // Only http(s) links survive; javascript:/data: are dropped here for good.
  payload.website = safeHttpUrl(payload.website);

  const svc = createServiceClient();

  // Resolve coordinates: use provided pin, else geocode the address.
  let lat = typeof payload.lat === "number" ? payload.lat : null;
  let lng = typeof payload.lng === "number" ? payload.lng : null;
  if ((lat == null || lng == null) && payload.address) {
    const g = await geocode(payload.address);
    if (g) {
      lat = g.lat;
      lng = g.lng;
    }
  }

  // Cross-check against Google Places: a match confirms the venue exists,
  // pins exact coordinates, and fills a missing address.
  let google: { place_id: string; matched_name: string } | null = null;
  if (googleEnabled()) {
    const results = await searchPlaces(
      svc,
      [payload.name, payload.address].filter(Boolean).join(", "),
      lat != null && lng != null ? { lat, lng, radiusMeters: 10_000 } : undefined,
      5,
    );
    const match = bestMatch(
      results,
      payload.name,
      lat != null && lng != null ? { lat, lng } : null,
      nameSimilarity,
      haversineMeters,
    );
    if (match?.location) {
      google = { place_id: match.id, matched_name: match.displayName?.text ?? payload.name };
      lat = match.location.latitude;
      lng = match.location.longitude;
      if (!payload.address && match.formattedAddress) {
        payload.address = match.formattedAddress;
      }
    }
  }

  // Nearest existing places for dedupe context.
  let nearest: NearbyPlace[] = [];
  if (lat != null && lng != null) {
    const { data } = await svc.rpc("nearest_places", { p_lng: lng, p_lat: lat, p_limit: 5 });
    nearest = (data ?? []) as NearbyPlace[];
  }

  const assessment = await assessSubmission({ ...payload, lat, lng }, nearest);

  // A Google Places match is strong evidence the venue is real.
  const score =
    (assessment?.quality_score ?? 0) + (google ? 0.12 : 0);
  const autoApprove =
    assessment != null &&
    assessment.plausible_real_place &&
    assessment.chess_relevant &&
    !assessment.likely_duplicate_of &&
    score >= AUTO_APPROVE &&
    lat != null &&
    lng != null;

  let placeId: string | null = null;
  if (autoApprove) {
    const cityId = (await svc.rpc("nearest_city_id", { p_lng: lng, p_lat: lat })).data ?? null;
    const { data: newId } = await svc.rpc("insert_scraped_place", {
      p_name: payload.name.trim(),
      p_kind: payload.kind,
      p_description: assessment?.suggested_copy ?? payload.notes ?? null,
      p_address: payload.address ?? null,
      p_city_id: cityId,
      p_lng: lng,
      p_lat: lat,
      p_website: payload.website ?? null,
      p_opening_notes: payload.when_notes ?? null,
      p_source: "user_submission",
      p_source_url: payload.website ?? null,
      p_confidence: Math.min(0.98, score) || 0.85,
      p_status: "approved",
    });
    placeId = (newId as string) ?? null;
    // Remember the Google id so nightly enrichment fills rating, photo and
    // hours without another search call.
    if (placeId && google) {
      await svc
        .from("places")
        .update({ google_place_id: google.place_id })
        .eq("id", placeId);
    }
  }

  const { error: insertError } = await svc.from("place_submissions").insert({
    submitted_by: user.id,
    payload: { ...payload, lat, lng, google_match: google },
    claude_assessment: assessment,
    place_id: placeId,
    status: autoApprove ? "auto_approved" : "pending",
  });
  if (insertError) {
    return NextResponse.json(
      { error: "Could not save the submission, try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: autoApprove ? "published" : "in_review",
    assessment,
  });
}
