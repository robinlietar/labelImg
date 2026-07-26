"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type OnboardingState = { error?: string };

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/**
 * Create the current user's profile. Home city sets a coarse location (the
 * city centroid) so distances work without ever collecting a precise position.
 */
export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const handle = String(formData.get("handle") ?? "")
    .toLowerCase()
    .trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const homeCityId = Number(formData.get("home_city_id"));
  const timeControls = formData.getAll("time_controls").map(String);
  const chips = formData.getAll("availability_chips").map(String);
  const ratingBand = String(formData.get("rating_band") ?? "").trim();
  const visible = formData.get("visible") === "on";

  if (!HANDLE_RE.test(handle))
    return { error: "Username: 3 to 20 lowercase letters, numbers, or underscores." };
  if (!displayName) return { error: "Add a display name." };
  if (!homeCityId) return { error: "Pick your home city." };

  const svc = createServiceClient();

  // Unique handle check.
  const { data: taken } = await svc
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle();
  if (taken) return { error: "That username is taken." };

  // Runs as the signed-in user: create_profile derives the row id from
  // auth.uid() and is not callable against anyone else.
  const { error } = await supabase.rpc("create_profile", {
    p_handle: handle,
    p_display_name: displayName,
    p_home_city_id: homeCityId,
    p_time_controls: timeControls.length ? timeControls : null,
    p_chips: chips.length ? chips : null,
    p_rating_band: ratingBand || null,
    p_visible: visible,
  });
  if (error) return { error: error.message };

  redirect("/onboarding/link");
}
