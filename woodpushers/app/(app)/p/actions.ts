"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function profileIdForHandle(handle: string): Promise<string | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  return data?.id ?? null;
}

/** Default structured opener the sender edits before sending. */
function defaultOpener(): string {
  return "Rapid 10+5 this week? Happy to meet at a spot near you.";
}

/**
 * Start (or reuse) a 1:1 conversation and open it with a prefilled draft. The
 * message is NOT sent automatically; the composer is seeded with the draft.
 */
export async function proposeGame(handle: string): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");
  const targetId = await profileIdForHandle(handle);
  if (!targetId) redirect(`/p/${handle}`);

  const supabase = await createClient();
  const { data: conversationId, error } = await supabase.rpc(
    "start_conversation",
    { other_profile: targetId },
  );
  if (error || !conversationId) redirect(`/p/${handle}?error=1`);

  redirect(`/chat/${conversationId}?draft=${encodeURIComponent(defaultOpener())}`);
}

export async function blockUser(handle: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const targetId = await profileIdForHandle(handle);
  if (!targetId) return;
  const svc = createServiceClient();
  await svc.from("blocks").insert({ blocker: user.id, blocked: targetId });
  revalidatePath(`/p/${handle}`);
}

export async function reportUser(handle: string, reason: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const targetId = await profileIdForHandle(handle);
  if (!targetId) return;
  const svc = createServiceClient();
  await svc
    .from("reports")
    .insert({ reporter: user.id, reported: targetId, reason });
}
