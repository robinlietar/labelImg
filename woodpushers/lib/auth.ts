import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Current authenticated user, or null. Never throws (missing env, outage).
 *
 * Fast path: getClaims() verifies the session JWT locally (asymmetric keys,
 * cached JWKS), avoiding a network round trip on every server-rendered page.
 * supabase-js RETURNS auth failures rather than throwing, so the network
 * fallback keys off the returned error: a transient key-fetch hiccup must
 * degrade to the slower check, never log a real user out. cache() dedupes
 * the check across one request (layout + page both call this).
 */
export const getUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    }
    const claims = data?.claims;
    if (claims?.sub) {
      return { id: claims.sub, email: claims.email } as User;
    }
    return null;
  } catch {
    return null;
  }
});

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  lichess_username: string | null;
  lichess_ratings: Record<string, number> | null;
  lichess_verified: boolean;
  lichess_title: string | null;
  lichess_meta: Record<string, unknown> | null;
  chesscom_username: string | null;
  chesscom_ratings: Record<string, number> | null;
  chesscom_verified: boolean;
  chesscom_title: string | null;
  chesscom_meta: Record<string, unknown> | null;
  preferred_time_controls: string[] | null;
  availability_status: "local" | "visiting";
  visiting_until: string | null;
  availability_chips: string[] | null;
  open_today_until: string | null;
  ratings_refreshed_at: string | null;
  home_city_id: number | null;
  home_city: { name: string; country_code: string } | null;
  visible: boolean;
  last_seen_at: string | null;
};

/** The current user's profile row, or null if not onboarded yet. Never throws. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  try {
    const supabase = await createClient();
    const user = await getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, handle, display_name, bio, avatar_url, lichess_username, lichess_ratings, lichess_verified, lichess_title, lichess_meta, chesscom_username, chesscom_ratings, chesscom_verified, chesscom_title, chesscom_meta, preferred_time_controls, availability_status, visiting_until, availability_chips, open_today_until, ratings_refreshed_at, home_city_id, home_city:cities(name, country_code), visible, last_seen_at",
      )
      .eq("id", user.id)
      .maybeSingle();
    return (data as unknown as Profile | null) ?? null;
  } catch {
    return null;
  }
})
