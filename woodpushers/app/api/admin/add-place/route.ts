import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { placeDetailsEx } from "@/lib/google-places";
import { safeHttpUrl } from "@/lib/utils";
import { PLACE_KINDS } from "@/lib/places";

export const dynamic = "force-dynamic";

/** Create a place from a picked Google listing, fully enriched on arrival. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { googlePlaceId?: string; kind?: string };
  try {
    body = (await request.json()) as { googlePlaceId?: string; kind?: string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.googlePlaceId) {
    return NextResponse.json({ error: "Pick a place first." }, { status: 400 });
  }
  const kind = (PLACE_KINDS as readonly string[]).includes(body.kind ?? "")
    ? body.kind!
    : "club";

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("places")
    .select("id, name")
    .eq("google_place_id", body.googlePlaceId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `Already on the map as "${existing.name}".` },
      { status: 409 },
    );
  }

  const { place: d, error } = await placeDetailsEx(svc, body.googlePlaceId);
  if (!d || !d.location) {
    return NextResponse.json(
      { error: error === "budget" ? "Monthly Google budget reached." : (error ?? "Google lookup failed.") },
      { status: 502 },
    );
  }

  const lng = d.location.longitude;
  const lat = d.location.latitude;
  const cityId = (await svc.rpc("nearest_city_id", { p_lng: lng, p_lat: lat })).data ?? null;
  const { data: newId, error: insErr } = await svc.rpc("insert_scraped_place", {
    p_name: d.displayName?.text ?? "Unnamed",
    p_kind: kind,
    p_description: null,
    p_address: d.formattedAddress ?? null,
    p_city_id: cityId,
    p_lng: lng,
    p_lat: lat,
    p_website: safeHttpUrl(d.websiteUri),
    p_opening_notes: null,
    p_source: "google",
    p_source_url: safeHttpUrl(d.googleMapsUri) ?? `https://www.google.com/maps/place/?q=place_id:${d.id}`,
    p_confidence: 0.9,
    p_status: "approved",
  });
  if (insErr || !newId) {
    return NextResponse.json({ error: "Could not create the place." }, { status: 500 });
  }
  await svc
    .from("places")
    .update({
      google_place_id: d.id,
      rating: d.rating ?? null,
      rating_count: d.userRatingCount ?? null,
      phone: d.internationalPhoneNumber ?? null,
      gmaps_url: safeHttpUrl(d.googleMapsUri),
      business_status: d.businessStatus ?? null,
      opening_hours: d.regularOpeningHours
        ? {
            weekday: d.regularOpeningHours.weekdayDescriptions ?? null,
            periods: d.regularOpeningHours.periods ?? null,
            utc_offset_minutes: d.utcOffsetMinutes ?? null,
          }
        : null,
      // Photo arrives on the next enrich pass.
    })
    .eq("id", newId as string);

  return NextResponse.json({
    ok: true,
    placeId: newId,
    name: d.displayName?.text ?? "",
  });
}
