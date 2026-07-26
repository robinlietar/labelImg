import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RatingBadges } from "@/components/profile/RatingBadges";
import { ProfileActions } from "@/components/players/ProfileActions";
import { availabilityLabel, activity, type PlayerRow } from "@/lib/players";
import { TIME_CONTROLS } from "@/lib/profile";

const TC_LABEL = Object.fromEntries(TIME_CONTROLS.map((t) => [t.value, t.label]));

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, handle, display_name, bio, lichess_username, lichess_ratings, lichess_verified, lichess_title, lichess_meta, chesscom_username, chesscom_ratings, chesscom_verified, chesscom_title, chesscom_meta, preferred_time_controls, availability_status, visiting_until, availability_chips, open_today_until, last_seen_at",
    )
    .eq("handle", handle)
    .maybeSingle();

  if (!data) notFound();
  const p = { ...data, distance_band: "", distance_sort: 0 } as PlayerRow;
  const user = await getUser();
  const isSelf = user?.id === p.id;
  const act = activity(p.last_seen_at);

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-8">
      <header className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-2xl">
          ♟
        </div>
        <div>
          <h1 className="text-xl font-semibold">{p.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{p.handle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{act.label}</p>
        </div>
      </header>

      {p.bio && <p className="mt-4 text-sm">{p.bio}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-secondary px-2 py-0.5">
          {availabilityLabel(p)}
        </span>
        {(p.preferred_time_controls ?? []).map((t) => (
          <span key={t} className="rounded-full border border-border px-2 py-0.5">
            {TC_LABEL[t] ?? t}
          </span>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-border p-4">
        <RatingBadges
          lichessUsername={p.lichess_username}
          lichessRatings={p.lichess_ratings}
          lichessVerified={p.lichess_verified}
          lichessTitle={p.lichess_title}
          lichessMeta={p.lichess_meta}
          chesscomUsername={p.chesscom_username}
          chesscomRatings={p.chesscom_ratings}
          chesscomVerified={p.chesscom_verified}
          chesscomTitle={p.chesscom_title}
          chesscomMeta={p.chesscom_meta}
        />
      </div>

      {!isSelf && (
        <div className="mt-6">
          <ProfileActions handle={p.handle} />
        </div>
      )}
    </main>
  );
}
