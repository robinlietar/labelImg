"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { safeHttpUrl } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin(): Promise<boolean> {
  const user = await getUser();
  return isAdmin(user?.id);
}

export type AdminActionResult = { ok: boolean; error?: string };

export type SubmissionEdits = {
  name?: string;
  kind?: string;
  address?: string;
  description?: string;
  website?: string;
};

/**
 * Publish a pending submission: create the place, mark the submission
 * approved. `edits` are the admin's corrections (possibly Claude's suggested
 * version) and override the submitted payload field by field.
 */
export async function approveSubmission(
  submissionId: string,
  edits?: SubmissionEdits,
): Promise<AdminActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "not admin" };
  const svc = createServiceClient();
  const { data: sub } = await svc
    .from("place_submissions")
    .select("id, payload")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "submission not found" };

  const p = { ...(sub.payload as Record<string, unknown>) };
  for (const [k, v] of Object.entries(edits ?? {})) {
    if (typeof v === "string" && v.trim()) p[k === "description" ? "notes" : k] = v.trim();
  }

  let lng = p.lng as number | null;
  let lat = p.lat as number | null;
  const addressEdited =
    edits?.address && edits.address !== (sub.payload as Record<string, unknown>).address;
  if ((lat == null || lng == null || addressEdited) && typeof p.address === "string") {
    // Re-geocode when coordinates are missing or the admin fixed the address.
    const { geocode } = await import("@/lib/nominatim");
    const g = await geocode(p.address);
    if (g) {
      lat = g.lat;
      lng = g.lng;
    }
  }
  if (lat == null || lng == null) {
    return {
      ok: false,
      error: "No coordinates and the address does not geocode. Reject, or fix the address in the database first.",
    };
  }

  const cityId =
    (await svc.rpc("nearest_city_id", { p_lng: lng, p_lat: lat })).data ?? null;
  const website = safeHttpUrl((p.website as string) ?? null);
  const { data: placeId } = await svc.rpc("insert_scraped_place", {
    p_name: String(p.name ?? ""),
    p_kind: String(p.kind ?? "other"),
    p_description: (p.notes as string) ?? null,
    p_address: (p.address as string) ?? null,
    p_city_id: cityId,
    p_lng: lng,
    p_lat: lat,
    p_website: website,
    p_opening_notes: (p.when_notes as string) ?? null,
    p_source: "user_submission",
    p_source_url: website,
    p_confidence: 1,
    p_status: "approved",
  });

  await svc
    .from("place_submissions")
    .update({ status: "approved", place_id: placeId ?? null })
    .eq("id", submissionId);
  revalidatePath("/admin");
  return { ok: true };
}

export async function rejectSubmission(submissionId: string): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc
    .from("place_submissions")
    .update({ status: "rejected" })
    .eq("id", submissionId);
  revalidatePath("/admin");
}

export async function mergeSubmission(
  submissionId: string,
  placeId: string,
): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc
    .from("place_submissions")
    .update({ status: "rejected", place_id: placeId })
    .eq("id", submissionId);
  revalidatePath("/admin");
}

export async function setPlaceStatus(
  placeId: string,
  status: "approved" | "rejected",
): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc.from("places").update({ status }).eq("id", placeId);
  revalidatePath("/admin");
}

export async function saveCityChat(
  cityId: number,
  url: string,
  notes: string,
  intro?: string,
): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc.from("city_chats").upsert({
    city_id: cityId,
    whatsapp_invite_url: safeHttpUrl(url),
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });
  if (intro !== undefined) {
    await svc.from("cities").update({ intro: intro || null }).eq("id", cityId);
  }
  revalidatePath("/admin");
}

export type PlaceEdits = {
  name?: string;
  kind?: string;
  address?: string;
  website?: string;
  description?: string;
  opening_notes?: string;
  status?: "pending" | "approved" | "rejected";
  lat?: number | null;
  lng?: number | null;
};

/**
 * Edit any place. Coordinates: explicit lat/lng win; otherwise a changed
 * address is re-geocoded via Nominatim.
 */
export async function updatePlace(
  placeId: string,
  edits: PlaceEdits,
  addressChanged: boolean,
): Promise<AdminActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "not admin" };
  const svc = createServiceClient();

  const fields: Record<string, unknown> = {};
  if (edits.name?.trim()) fields.name = edits.name.trim();
  if (edits.kind) fields.kind = edits.kind;
  if (edits.address !== undefined) fields.address = edits.address.trim() || null;
  if (edits.website !== undefined) fields.website = safeHttpUrl(edits.website);
  if (edits.description !== undefined)
    fields.description = edits.description.trim() || null;
  if (edits.opening_notes !== undefined)
    fields.opening_notes = edits.opening_notes.trim() || null;
  if (edits.status) fields.status = edits.status;

  const { error } = await svc.from("places").update(fields).eq("id", placeId);
  if (error) return { ok: false, error: error.message };

  const hasManualCoords =
    typeof edits.lat === "number" && typeof edits.lng === "number";
  if (hasManualCoords) {
    await svc.rpc("set_place_location", {
      p_id: placeId,
      p_lng: edits.lng,
      p_lat: edits.lat,
    });
  } else if (addressChanged && edits.address?.trim()) {
    const { geocode } = await import("@/lib/nominatim");
    const g = await geocode(edits.address);
    if (g) {
      await svc.rpc("set_place_location", {
        p_id: placeId,
        p_lng: g.lng,
        p_lat: g.lat,
      });
    } else {
      revalidatePath("/admin");
      return {
        ok: true,
        error: "Saved, but the new address did not geocode; set lat/lng manually.",
      };
    }
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** One-tap address to coordinates lookup for the admin editors. */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!(await assertAdmin())) return null;
  if (!address.trim()) return null;
  const { geocode } = await import("@/lib/nominatim");
  return geocode(address.trim());
}

export async function resolveReport(reportId: string): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc.from("reports").update({ status: "resolved" }).eq("id", reportId);
  revalidatePath("/admin");
}
