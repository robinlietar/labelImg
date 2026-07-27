import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { RatingBadges } from "@/components/profile/RatingBadges";
import {
  activity,
  availabilityLabel,
  selfBandLabel,
  type PlayerRow,
} from "@/lib/players";
import { TIME_CONTROLS } from "@/lib/profile";
import { cn } from "@/lib/utils";

const TC_LABEL = Object.fromEntries(TIME_CONTROLS.map((t) => [t.value, t.label]));

/**
 * Player card. Ratings and availability carry the card, not photos. No like or
 * connect buttons: the primary action is "Propose a game", which opens a chat.
 */
export function PlayerCard({ player }: { player: PlayerRow }) {
  const act = activity(player.last_seen_at);
  const open =
    player.open_today_until &&
    new Date(player.open_today_until).getTime() > Date.now();

  return (
    <Link
      href={`/p/${player.handle}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar url={player.avatar_url} size={44} />
          <div>
            <p className="font-medium leading-tight">{player.display_name}</p>
            <p className="text-xs text-muted-foreground">@{player.handle}</p>
          </div>
        </div>
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          title={act.label}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              act.fresh ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
          {player.distance_band === "unknown" ? "" : player.distance_band}
        </span>
      </div>

      {player.lichess_username || player.chesscom_username ? (
        <RatingBadges
          lichessUsername={player.lichess_username}
          lichessRatings={player.lichess_ratings}
          lichessVerified={player.lichess_verified}
          lichessTitle={player.lichess_title}
          lichessMeta={player.lichess_meta}
          chesscomUsername={player.chesscom_username}
          chesscomRatings={player.chesscom_ratings}
          chesscomVerified={player.chesscom_verified}
          chesscomTitle={player.chesscom_title}
          chesscomMeta={player.chesscom_meta}
        />
      ) : selfBandLabel(player.self_rating_band) ? (
        <p className="text-sm text-muted-foreground">
          {selfBandLabel(player.self_rating_band)}{" "}
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">
            Self-declared
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span
          className={cn(
            "rounded-full px-2 py-0.5",
            open
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {availabilityLabel(player)}
        </span>
        {(player.preferred_time_controls ?? []).map((t) => (
          <span
            key={t}
            className="rounded-full border border-border px-2 py-0.5 text-muted-foreground"
          >
            {TC_LABEL[t] ?? t}
          </span>
        ))}
      </div>
    </Link>
  );
}
