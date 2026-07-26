import { createServiceClient } from "@/lib/supabase/service";
import { fetchLichessProfile } from "@/lib/lichess";
import { fetchChesscomProfile } from "@/lib/chesscom";

type LinkedProfile = {
  id: string;
  lichess_username: string | null;
  chesscom_username: string | null;
  chesscom_verified: boolean;
};

/** Refresh one user's linked ratings from the public APIs. Never throws. */
export async function refreshRatingsFor(p: LinkedProfile): Promise<boolean> {
  const svc = createServiceClient();
  const update: Record<string, unknown> = {
    ratings_refreshed_at: new Date().toISOString(),
  };
  try {
    if (p.lichess_username) {
      const li = await fetchLichessProfile(p.lichess_username);
      if (Object.keys(li.ratings).length) {
        update.lichess_ratings = li.ratings;
        update.lichess_title = li.title;
        update.lichess_meta = li.meta;
      }
    }
    if (p.chesscom_username && p.chesscom_verified) {
      const cc = await fetchChesscomProfile(p.chesscom_username);
      if (Object.keys(cc.ratings).length) {
        update.chesscom_ratings = cc.ratings;
        update.chesscom_title = cc.title;
        update.chesscom_meta = cc.meta;
      }
    }
    await svc.from("profiles").update(update).eq("id", p.id);
    return true;
  } catch {
    return false;
  }
}

/** Refresh a single user by id, used on login. */
export async function refreshRatingsByUserId(userId: string): Promise<void> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("profiles")
    .select("id, lichess_username, chesscom_username, chesscom_verified")
    .eq("id", userId)
    .maybeSingle();
  if (data && (data.lichess_username || data.chesscom_username)) {
    await refreshRatingsFor(data as LinkedProfile);
  }
}

/** Daily batch used by the cron. Oldest-refreshed first, gentle pace. */
export async function refreshAllLinked(maxCount = 200): Promise<number> {
  const svc = createServiceClient();
  const { data } = await svc.rpc("profiles_to_refresh", {
    max_count: maxCount,
  });
  let done = 0;
  for (const p of (data ?? []) as LinkedProfile[]) {
    if (await refreshRatingsFor(p)) done++;
    await new Promise((r) => setTimeout(r, 300)); // be polite to both APIs
  }
  return done;
}
