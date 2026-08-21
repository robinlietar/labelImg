import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayersFilters } from "@/components/players/PlayersFilters";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { BioEditor } from "@/components/profile/BioEditor";
import { LocationSettings } from "@/components/profile/LocationSettings";
import { AvailabilityToggle } from "@/components/profile/AvailabilityToggle";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { RatingBadges } from "@/components/profile/RatingBadges";
import { ChesscomLink } from "@/components/profile/ChesscomLink";
import { SyncStatus } from "@/components/profile/SyncStatus";
import { ShareButton } from "@/components/ShareButton";
import { SubmissionCard } from "@/components/admin/SubmissionCard";
import { EditablePlaceCard } from "@/components/admin/EditablePlaceCard";
import { Button } from "@/components/ui/button";
import { relTime } from "@/lib/time";
import type { PlayerRow } from "@/lib/players";

/**
 * DEV-ONLY component preview with fixture data, for visual QA of screens that
 * normally need auth + a database. Unreachable whenever Supabase is
 * configured, so it never exists in a real deployment.
 */

const NOW = Date.now();
const iso = (minAgo: number) => new Date(NOW - minAgo * 60000).toISOString();

const base = {
  bio: null,
  avatar_url: null,
  lichess_username: null,
  lichess_ratings: null,
  lichess_verified: false,
  lichess_title: null,
  lichess_meta: null,
  chesscom_username: null,
  chesscom_ratings: null,
  chesscom_verified: false,
  chesscom_title: null,
  chesscom_meta: null,
  self_rating_band: null,
  preferred_time_controls: null,
  availability_status: "local" as const,
  visiting_until: null,
  availability_chips: null,
  open_today_until: null,
  last_seen_at: iso(30),
  distance_band: "~2 km",
  distance_sort: 0,
};

const PLAYERS: PlayerRow[] = [
  {
    ...base,
    id: "1",
    handle: "robinobok",
    display_name: "Robin",
    bio: "Founder of the Sydney and Paris crews.",
    lichess_username: "robinobok",
    lichess_ratings: { blitz: 2105, rapid: 2010, classical: 1950 },
    lichess_verified: true,
    lichess_meta: { games: 4210, fide: null },
    preferred_time_controls: ["blitz", "rapid"],
    open_today_until: iso(-600),
    distance_band: "< 1 km",
  },
  {
    ...base,
    id: "2",
    handle: "marie_k",
    display_name: "Marie K.",
    chesscom_username: "mariek",
    chesscom_ratings: { rapid: 1450, blitz: 1380 },
    chesscom_verified: true,
    chesscom_meta: { best: { rapid: 1502 } },
    preferred_time_controls: ["rapid", "classical"],
    availability_status: "visiting",
    visiting_until: new Date(NOW + 12 * 86400000).toISOString().slice(0, 10),
    distance_band: "~5 km",
    last_seen_at: iso(60 * 26),
  },
  {
    ...base,
    id: "3",
    handle: "park_pawn",
    display_name: "Sam",
    self_rating_band: "1400_1800",
    preferred_time_controls: ["blitz"],
    distance_band: "~10 km",
    last_seen_at: iso(60 * 24 * 6),
  },
];

const CHATS = [
  { id: "c1", name: "Marie K.", last: "Rapid 10+5 at Hyde Park this Saturday?", at: iso(12), unread: 2 },
  { id: "c2", name: "Sam", last: "Good game! Rematch next week.", at: iso(60 * 5), unread: 0 },
  { id: "c3", name: "Viktor", last: "The club night moved to Tuesdays.", at: iso(60 * 24 * 2), unread: 0 },
];

const THREAD = [
  { id: "m1", mine: false, body: "Hey! Saw you play blitz. Up for a game?", at: iso(60 * 26) },
  { id: "m2", mine: true, body: "Always. Hyde Park giant board?", at: iso(60 * 25) },
  { id: "m3", mine: false, body: "Rapid 10+5 at Hyde Park this Saturday?", at: iso(20) },
  { id: "m4", mine: true, body: "See you there at 10.", at: iso(2) },
];

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  // Hard gate: this page does not exist once Supabase is configured.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) notFound();
  const { s } = await searchParams;
  const show = (key: string) => !s || s === key;

  return (
    <div className={s === "admin" ? "w-full px-5 pb-28 pt-6" : "mx-auto w-full max-w-md px-5 pb-28 pt-6"}>
      <p className="mb-4 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-700">
        Dev preview with fixture data. Not reachable in production.
      </p>

      {show("players") && (
        <section className="mb-10">
          <h1 className="text-xl font-semibold">Players nearby</h1>
          <div className="mt-3">
            <PlayersFilters />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {PLAYERS.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </section>
      )}

      {show("chat") && (
        <section className="mb-10">
          <h1 className="text-xl font-semibold">Chats</h1>
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {CHATS.map((c) => (
              <li key={c.id}>
                <div className="flex items-center gap-3 py-3">
                  <Avatar url={null} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.name}</p>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {relTime(c.at)}
                        </span>
                        {c.unread > 0 && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{c.last}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {show("thread") && (
        <section className="mb-10">
          <div className="overflow-hidden rounded-xl border border-border">
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <span className="text-muted-foreground">←</span>
              <span className="flex items-center gap-2 font-medium">
                <Avatar url={null} size={32} /> Marie K.
              </span>
            </header>
            <div className="space-y-1.5 px-4 py-4">
              {THREAD.map((m, i) => {
                const prev = THREAD[i - 1];
                const newDay =
                  !prev ||
                  new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
                return (
                  <div key={m.id}>
                    {newDay && (
                      <p className="my-3 text-center text-[11px] font-medium text-muted-foreground">
                        {new Date(m.at).toDateString() === new Date().toDateString()
                          ? "Today"
                          : "Yesterday"}
                      </p>
                    )}
                    <div className={m.mine ? "flex justify-end" : "flex justify-start"}>
                      <div className="max-w-[80%]">
                        <div
                          className={
                            m.mine
                              ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                              : "rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"
                          }
                        >
                          {m.body}
                        </div>
                        <p
                          className={
                            "mt-0.5 text-[10px] text-muted-foreground " +
                            (m.mine ? "text-right" : "text-left")
                          }
                        >
                          {new Date(m.at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-end gap-2 border-t border-border p-3">
              <div className="h-11 flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-base text-muted-foreground">
                Propose a game...
              </div>
              <Button size="icon" aria-label="Send">↑</Button>
            </div>
          </div>
        </section>
      )}

      {show("me") && (
        <section className="mb-10">
          <header className="flex items-center gap-4">
            <AvatarUpload userId="preview" currentUrl={null} />
            <div>
              <h1 className="text-xl font-semibold">Robin</h1>
              <p className="text-sm text-muted-foreground">@robinobok</p>
            </div>
          </header>
          <div className="mt-6">
            <AvailabilityToggle active={true} />
          </div>
          <div className="mt-6 rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold">Chess accounts</h2>
            <div className="mt-3">
              <RatingBadges
                lichessUsername="robinobok"
                lichessRatings={{ blitz: 2105, rapid: 2010 }}
                lichessVerified={true}
                lichessMeta={{ games: 4210 }}
                chesscomUsername="robinobok"
                chesscomRatings={null}
                chesscomVerified={false}
              />
            </div>
            <div className="mt-4">
              <ChesscomLink initialUsername="robinobok" initialVerified={true} />
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <SyncStatus lastSynced={iso(90)} />
            </div>
          </div>
          <div className="mt-6">
            <BioEditor userId="preview" initialBio="Caro-Kann devotee, up for rapid most evenings." />
          </div>
          <div className="mt-6">
            <LocationSettings currentCity="Sydney, AU" />
          </div>
          <div className="mt-6">
            <ShareButton
              title="ChessNow"
              text="Find over-the-board chess near you."
              label="Invite friends"
              className="w-full"
            />
          </div>
          <div className="mt-6">
            <VisibilityToggle visible={true} />
          </div>
        </section>
      )}

      {show("onboard") && (
        <section className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Step 1 of 2
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Set up your profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two minutes. You can change all of this later.
          </p>
          <div className="mt-6">
            <OnboardingForm />
          </div>
        </section>
      )}

      {show("admin") && (
        <section className="mb-10">
          <h1 className="text-xl font-semibold">Admin cards</h1>
          <div className="mt-4 flex flex-col gap-3">
            <SubmissionCard
              sub={{
                id: "s1",
                created_at: iso(45),
                payload: {
                  name: "cafe de la regence",
                  kind: "cafe",
                  address: "rue st honore paris",
                  when_notes: "friday evenings",
                  notes: "old chess cafe, people bring boards",
                },
                claude_assessment: {
                  plausible_real_place: true,
                  chess_relevant: true,
                  likely_duplicate_of: null,
                  quality_score: 0.72,
                  issues: ["address is incomplete"],
                  suggested_copy: "Historic-styled cafe with regular Friday chess evenings.",
                  suggested: {
                    name: "Cafe de la Regence",
                    kind: "cafe",
                    address: "Rue Saint-Honore, 75001 Paris",
                    description: "Historic-styled cafe with regular Friday chess evenings.",
                    website: null,
                  },
                },
              }}
            />
            <EditablePlaceCard
              startOpen
              place={{
                id: "p1",
                name: "Hyde Park Giant Chess",
                kind: "park",
                description: "Outdoor giant chess set in Nagoya Gardens.",
                address: "Hyde Park, Sydney NSW",
                website: null,
                opening_notes: "Daytime, weather dependent",
                source: "import",
                source_url: null,
                confidence: 0.95,
                status: "pending",
                city_name: "Sydney",
                lng: 151.2117,
                lat: -33.8747,
                created_at: iso(1440),
              }}
            />
          </div>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Sections:{" "}
        {["players", "chat", "thread", "me", "onboard", "admin"].map((k) => (
          <Link key={k} href={`/dev/preview?s=${k}`} className="mx-1 underline">
            {k}
          </Link>
        ))}
      </p>
    </div>
  );
}
