import { BadgeCheck } from "lucide-react";

function RatingRow({
  site,
  username,
  verified,
  ratings,
}: {
  site: "Lichess" | "chess.com";
  username: string | null;
  verified: boolean;
  ratings: Record<string, number> | null;
}) {
  if (!username) return null;
  const shown = ["blitz", "rapid", "classical"]
    .map((k) => (ratings?.[k] != null ? `${k[0].toUpperCase()} ${ratings[k]}` : null))
    .filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-medium">{site}</span>
      <span className="text-muted-foreground">{username}</span>
      {verified ? (
        <BadgeCheck className="h-4 w-4 text-primary" aria-label="verified" />
      ) : (
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
          unverified
        </span>
      )}
      {shown.length > 0 && (
        <span className="text-muted-foreground">· {shown.join("  ")}</span>
      )}
    </div>
  );
}

export function RatingBadges({
  lichessUsername,
  lichessRatings,
  lichessVerified,
  chesscomUsername,
  chesscomRatings,
  chesscomVerified,
}: {
  lichessUsername: string | null;
  lichessRatings: Record<string, number> | null;
  lichessVerified: boolean;
  chesscomUsername: string | null;
  chesscomRatings: Record<string, number> | null;
  chesscomVerified: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RatingRow
        site="Lichess"
        username={lichessUsername}
        verified={lichessVerified}
        ratings={lichessRatings}
      />
      <RatingRow
        site="chess.com"
        username={chesscomUsername}
        verified={chesscomVerified}
        ratings={chesscomRatings}
      />
    </div>
  );
}
