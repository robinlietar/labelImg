/** Types and helpers for the players directory. */

export type PlayerRow = {
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
  self_rating_band: string | null;
  preferred_time_controls: string[] | null;
  availability_status: "local" | "visiting";
  visiting_until: string | null;
  availability_chips: string[] | null;
  open_today_until: string | null;
  last_seen_at: string | null;
  distance_band: string;
  distance_sort: number;
};

/** Human availability line for a card. */
export function availabilityLabel(p: PlayerRow): string {
  if (p.open_today_until && new Date(p.open_today_until).getTime() > Date.now())
    return "Up for a game today";
  if (p.availability_status === "visiting" && p.visiting_until) {
    const d = new Date(p.visiting_until);
    return `Visiting until ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
  }
  return "Lives here";
}

/** Label for a self-declared strength band (players with no linked account). */
export function selfBandLabel(band: string | null): string | null {
  switch (band) {
    case "under_1000":
      return "New / under 1000";
    case "1000_1400":
      return "1000 to 1400";
    case "1400_1800":
      return "1400 to 1800";
    case "1800_2200":
      return "1800 to 2200";
    case "over_2200":
      return "2200+";
    default:
      return null;
  }
}

/** Activity: green dot under 48h, else "active N days ago". */
export function activity(lastSeen: string | null): {
  fresh: boolean;
  label: string;
} {
  if (!lastSeen) return { fresh: false, label: "new" };
  const ms = Date.now() - new Date(lastSeen).getTime();
  const hours = ms / 3_600_000;
  if (hours < 48) return { fresh: true, label: "active recently" };
  const days = Math.round(hours / 24);
  return { fresh: false, label: `active ${days}d ago` };
}
