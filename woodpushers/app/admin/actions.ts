"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin(): Promise<boolean> {
  const user = await getUser();
  return isAdmin(user?.id);
}

/** Publish a pending submission: create the place, mark the submission approved. */
export async function approveSubmission(submissionId: string): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  const { data: sub } = await svc
    .from("place_submissions")
    .select("id, payload")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return;

  const p = sub.payload as Record<string, unknown>;
  const lng = p.lng as number | null;
  const lat = p.lat as number | null;
  if (lat == null || lng == null) return;

  const cityId =
    (await svc.rpc("nearest_city_id", { p_lng: lng, p_lat: lat })).data ?? null;
  const { data: placeId } = await svc.rpc("insert_scraped_place", {
    p_name: String(p.name ?? ""),
    p_kind: String(p.kind ?? "other"),
    p_description: (p.notes as string) ?? null,
    p_address: (p.address as string) ?? null,
    p_city_id: cityId,
    p_lng: lng,
    p_lat: lat,
    p_website: (p.website as string) ?? null,
    p_opening_notes: (p.when_notes as string) ?? null,
    p_source: "user_submission",
    p_source_url: (p.website as string) ?? null,
    p_confidence: 1,
    p_status: "approved",
  });

  await svc
    .from("place_submissions")
    .update({ status: "approved", place_id: placeId ?? null })
    .eq("id", submissionId);
  revalidatePath("/admin");
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
): Promise<void> {
  if (!(await assertAdmin())) return;
  const svc = createServiceClient();
  await svc.from("city_chats").upsert({
    city_id: cityId,
    whatsapp_invite_url: url || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/admin");
}
