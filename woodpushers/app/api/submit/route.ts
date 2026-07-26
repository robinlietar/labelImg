import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { canSubmit } from "@/lib/rate-limit";
import { geocode } from "@/lib/nominatim";
import { safeHttpUrl } from "@/lib/utils";
import { PLACE_KINDS } from "@/lib/places";
import { assessSubmission, type NearbyPlace, type SubmissionPayload } from "@/lib/assess";

const AUTO_APPROVE = 0.85;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  if (!(await canSubmit(user.id)))
    return NextResponse.json({ error: "daily submission limit reached" }, { status: 429 });

  let payload: SubmissionPayload;
  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json({ error: "bad request body" }, { status: 400 });
  }
  if (!payload?.name?.trim() || !payload?.kind)
    return NextResponse.json({ error: "name and kind required" }, { status: 400 });
  if (!(PLACE_KINDS as readonly string[]).includes(payload.kind))
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
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

  // Nearest existing places for dedupe context.
  let nearest: NearbyPlace[] = [];
  if (lat != null && lng != null) {
    const { data } = await svc.rpc("nearest_places", { p_lng: lng, p_lat: lat, p_limit: 5 });
    nearest = (data ?? []) as NearbyPlace[];
  }

  const assessment = await assessSubmission({ ...payload, lat, lng }, nearest);

  const autoApprove =
    assessment != null &&
    assessment.plausible_real_place &&
    assessment.chess_relevant &&
    !assessment.likely_duplicate_of &&
    assessment.quality_score >= AUTO_APPROVE &&
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
      p_confidence: assessment?.quality_score ?? 0.85,
      p_status: "approved",
    });
    placeId = (newId as string) ?? null;
  }

  const { error: insertError } = await svc.from("place_submissions").insert({
    submitted_by: user.id,
    payload: { ...payload, lat, lng },
    claude_assessment: assessment,
    place_id: placeId,
    status: autoApprove ? "auto_approved" : "pending",
  });
  if (insertError) {
    return NextResponse.json(
      { error: "could not save the submission, try again" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: autoApprove ? "published" : "in_review",
    assessment,
  });
}
