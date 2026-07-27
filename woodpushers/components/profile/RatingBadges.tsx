import { BadgeCheck } from "lucide-react";

function metaLine(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  const games = meta.games as number | undefined;
  if (typeof games === "number" && games > 0)
    parts.push(`${games.toLocaleString()} games`);
  const fide = meta.fide as number | undefined;
  if (typeof fide === "number" && fide > 0) parts.push(`FIDE ${fide}`);
  const best = meta.best as Record<string, number> | undefined;
  if (best) {
    const top = Math.max(...Object.values(best).filter((v) => typeof v === "number"), 0);
    if (top > 0) parts.push(`best ${top}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

function RatingRow({
  site,
  username,
  verified,
  title,
  ratings,
  meta,
}: {
  site: "Lichess" | "chess.com";
  username: string | null;
  verified: boolean;
  title?: string | null;
  ratings: Record<string, number> | null;
  meta?: Record<string, unknown> | null;
}) {
  if (!username) return null;
  const label: Record<string, string> = {
    blitz: "Blitz",
    rapid: "Rapid",
    classical: "Classical",
  };
  const shown = ["blitz", "rapid", "classical"]
    .map((k) => (ratings?.[k] != null ? `${label[k]} ${ratings[k]}` : null))
    .filter(Boolean);
  const extra = metaLine(meta);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {title && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            {title}
          </span>
        )}
        <span className="font-medium">{site}</span>
        <span className="text-muted-foreground">{username}</span>
        {verified ? (
          <BadgeCheck className="h-4 w-4 text-primary" aria-label="verified" />
        ) : (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
            Unverified
          </span>
        )}
        {shown.length > 0 && (
          <span className="text-muted-foreground">{shown.join(" · ")}</span>
        )}
      </div>
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
    </div>
  );
}

export function RatingBadges({
  lichessUsername,
  lichessRatings,
  lichessVerified,
  lichessTitle,
  lichessMeta,
  chesscomUsername,
  chesscomRatings,
  chesscomVerified,
  chesscomTitle,
  chesscomMeta,
}: {
  lichessUsername: string | null;
  lichessRatings: Record<string, number> | null;
  lichessVerified: boolean;
  lichessTitle?: string | null;
  lichessMeta?: Record<string, unknown> | null;
  chesscomUsername: string | null;
  chesscomRatings: Record<string, number> | null;
  chesscomVerified: boolean;
  chesscomTitle?: string | null;
  chesscomMeta?: Record<string, unknown> | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RatingRow
        site="Lichess"
        username={lichessUsername}
        verified={lichessVerified}
        title={lichessTitle}
        ratings={lichessRatings}
        meta={lichessMeta}
      />
      <RatingRow
        site="chess.com"
        username={chesscomUsername}
        verified={chesscomVerified}
        title={chesscomTitle}
        ratings={chesscomRatings}
        meta={chesscomMeta}
      />
    </div>
  );
}
