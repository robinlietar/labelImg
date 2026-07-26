import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Current authenticated user, or null. Never throws (missing env, outage). */
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export type Profile = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
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
  home_city_id: number | null;
  visible: boolean;
  last_seen_at: string | null;
};

/** The current user's profile row, or null if not onboarded yet. Never throws. */
export async function getProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, handle, display_name, bio, lichess_username, lichess_ratings, lichess_verified, lichess_title, lichess_meta, chesscom_username, chesscom_ratings, chesscom_verified, chesscom_title, chesscom_meta, preferred_time_controls, availability_status, visiting_until, availability_chips, open_today_until, home_city_id, visible, last_seen_at",
      )
      .eq("id", user.id)
      .maybeSingle();
    return (data as Profile | null) ?? null;
  } catch {
    return null;
  }
}
