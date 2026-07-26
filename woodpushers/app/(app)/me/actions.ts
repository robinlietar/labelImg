"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** "Up for a game today": set open_today_until to tonight, or clear it. */
export async function setOpenToday(on: boolean): Promise<void> {
  const user = await getUser();
  if (!user) return;
  let until: string | null = null;
  if (on) {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    until = d.toISOString();
  }
  const svc = createServiceClient();
  await svc.from("profiles").update({ open_today_until: until }).eq("id", user.id);
  revalidatePath("/me");
}

export async function setVisible(visible: boolean): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const svc = createServiceClient();
  await svc.from("profiles").update({ visible }).eq("id", user.id);
  revalidatePath("/me");
}

/** Set home city (manual). Recomputes coarse location from the city centroid. */
export async function setHomeCity(cityId: number): Promise<void> {
  // Run as the user so auth.uid() resolves inside the RPC.
  const supabase = await createClient();
  await supabase.rpc("set_home_city", { p_city_id: cityId });
  revalidatePath("/me");
}

/**
 * Set location from a device coordinate. Coarsened on the client before it is
 * sent, and coarsened again server-side, so a precise position is never stored.
 */
export async function setLocationFromDevice(lng: number, lat: number): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("set_location_point", { p_lng: lng, p_lat: lat });
  revalidatePath("/me");
}

export async function setAvailabilityStatus(
  status: "local" | "visiting",
  visitingUntil: string | null,
): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const svc = createServiceClient();
  await svc
    .from("profiles")
    .update({
      availability_status: status,
      visiting_until: status === "visiting" ? visitingUntil : null,
    })
    .eq("id", user.id);
  revalidatePath("/me");
}
