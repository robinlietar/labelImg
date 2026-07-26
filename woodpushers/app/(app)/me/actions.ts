"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
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
