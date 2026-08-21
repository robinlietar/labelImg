import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { RatingBadges } from "@/components/profile/RatingBadges";
import { ChesscomLink } from "@/components/profile/ChesscomLink";
import { SyncStatus } from "@/components/profile/SyncStatus";
import { AvailabilityToggle } from "@/components/profile/AvailabilityToggle";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { BioEditor } from "@/components/profile/BioEditor";
import { ShareButton } from "@/components/ShareButton";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { LocationSettings } from "@/components/profile/LocationSettings";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { KIND_LABEL } from "@/lib/places";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Me" };

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");
  const { link } = await searchParams;

  const openToday =
    !!profile.open_today_until &&
    new Date(profile.open_today_until).getTime() > Date.now();

  const cityName = profile.home_city
    ? `${profile.home_city.name}, ${profile.home_city.country_code}`
    : null;

  // Favorites, mates and follower counts in parallel. The follow RPCs are
  // missing until migration 0024 runs: degrade to empty, never crash.
  const supabase = await createClient();
  const [{ data: favData }, matesRes, followRes] = await Promise.all([
    supabase
      .from("place_favorites")
      .select("place:places(id, name, kind, address)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("my_mates").then(
      (r) => r,
      () => ({ data: null }),
    ),
    supabase.rpc("follow_info", { p_id: profile.id }).then(
      (r) => r,
      () => ({ data: null }),
    ),
  ]);
  const favorites = (favData ?? [])
    .map((f) => (Array.isArray(f.place) ? f.place[0] : f.place))
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    kind: string;
    address: string | null;
  }>;
  const mates = (matesRes.data ?? []) as Array<{
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    follows_me: boolean;
  }>;
  const followers =
    (followRes.data as Array<{ followers: number }> | null)?.[0]?.followers ?? 0;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      {link === "lichess_ok" && (
        <p className="mb-4 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          Lichess linked and verified.
        </p>
      )}
      {link === "lichess_error" && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Lichess linking failed, try again.
        </p>
      )}
      <header className="flex items-center gap-4">
        <AvatarUpload userId={profile.id} currentUrl={profile.avatar_url} />
        <div>
          <h1 className="text-xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.handle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mates.length} following · {followers}{" "}
            {followers === 1 ? "follower" : "followers"} · {favorites.length}{" "}
            {favorites.length === 1 ? "favorite" : "favorites"}
          </p>
        </div>
      </header>

      <SectionLabel>Up for a game</SectionLabel>
      <section className="flex flex-col gap-3">
        <AvailabilityToggle active={openToday} />
        <VisibilityToggle visible={profile.visible} />
      </section>

      <SectionLabel>Chess accounts</SectionLabel>
      <section className="rounded-xl border border-border p-4">
        <div>
          <RatingBadges
            lichessUsername={profile.lichess_username}
            lichessRatings={profile.lichess_ratings}
            lichessVerified={profile.lichess_verified}
            lichessTitle={profile.lichess_title}
            lichessMeta={profile.lichess_meta}
            chesscomUsername={profile.chesscom_username}
            chesscomRatings={profile.chesscom_ratings}
            chesscomVerified={profile.chesscom_verified}
            chesscomTitle={profile.chesscom_title}
            chesscomMeta={profile.chesscom_meta}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {profile.lichess_verified ? (
            <a
              href="/api/link/lichess/start"
              className="text-xs text-muted-foreground underline"
            >
              Change Lichess account
            </a>
          ) : (
            <a href="/api/link/lichess/start">
              <Button variant="outline" className="w-full">
                Link Lichess
              </Button>
            </a>
          )}
          <div>
            {!profile.chesscom_verified && (
              <p className="mb-1 text-xs text-muted-foreground">chess.com</p>
            )}
            <ChesscomLink
              initialUsername={profile.chesscom_username}
              initialVerified={profile.chesscom_verified}
            />
          </div>
        </div>

        {(profile.lichess_username || profile.chesscom_username) && (
          <div className="mt-4 border-t border-border pt-3">
            <SyncStatus lastSynced={profile.ratings_refreshed_at} />
          </div>
        )}
      </section>

      <SectionLabel>Profile</SectionLabel>
      <section className="flex flex-col gap-3">
        <BioEditor userId={profile.id} initialBio={profile.bio} />
        <div>
          <LocationSettings currentCity={cityName} />
          {profile.home_city && (
            <a
              href={`/city/${profile.home_city.slug}`}
              className="mt-2 block text-center text-sm text-primary underline"
            >
              Open the {profile.home_city.name} city page
            </a>
          )}
        </div>
      </section>

      <SectionLabel>
        Mates{mates.length > 0 ? ` (${mates.length})` : ""}
      </SectionLabel>
      {mates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Follow players you meet so you can find them again. The follow
          button lives on their profile.
        </p>
      ) : (
        <section className="rounded-xl border border-border px-4 py-1">
          <ul className="flex flex-col divide-y divide-border">
            {mates.map((m) => (
              <li key={m.id}>
                <Link href={`/p/${m.handle}`} className="flex items-center gap-3 py-2.5">
                  <Avatar url={m.avatar_url} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {m.display_name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      @{m.handle}
                    </span>
                  </span>
                  {m.follows_me && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                      Follows you
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {favorites.length > 0 && (
        <>
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
              Favorite places
            </span>
          </SectionLabel>
          <section className="rounded-xl border border-border px-4 py-1">
            <ul className="flex flex-col divide-y divide-border">
              {favorites.map((f) => (
                <li key={f.id}>
                  <Link href={`/place/${f.id}`} className="block py-2.5">
                    <span className="block font-medium">{f.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {KIND_LABEL[f.kind as keyof typeof KIND_LABEL] ?? f.kind}
                      {f.address ? ` · ${f.address}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="mt-8 flex flex-col gap-2">
        <ShareButton
          title="ChessNow"
          text="Find over-the-board chess near you: places to play and players to meet."
          label="Invite friends"
          className="w-full"
        />
        <form action="/auth/signout" method="post">
          <Button variant="ghost" className="w-full text-muted-foreground">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}

/** Small uppercase divider that keeps the long profile scannable. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}
