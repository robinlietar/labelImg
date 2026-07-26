import { createServiceClient } from "@/lib/supabase/service";

/**
 * Server-side rate limits backed by Postgres counts, so they hold across
 * serverless invocations. Messaging conversation limits are enforced in the
 * start_conversation RPC; these cover submissions and other write paths.
 */

/** How many place submissions a user may create per rolling 24 hours. */
export const SUBMISSIONS_PER_DAY = 10;

export async function submissionsInLastDay(userId: string): Promise<number> {
  const svc = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await svc
    .from("place_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", userId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function canSubmit(userId: string): Promise<boolean> {
  return (await submissionsInLastDay(userId)) < SUBMISSIONS_PER_DAY;
}

/** Simple polite delay used by the Nominatim client (1 req/s). */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
