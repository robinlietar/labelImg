import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RatingBadges } from "@/components/profile/RatingBadges";
import { ChesscomLink } from "@/components/profile/ChesscomLink";
import { AvailabilityToggle } from "@/components/profile/AvailabilityToggle";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { BioEditor } from "@/components/profile/BioEditor";
import { ShareButton } from "@/components/ShareButton";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { LocationSettings } from "@/components/profile/LocationSettings";
import { Button } from "@/components/ui/button";

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

  let cityName: string | null = null;
  if (profile.home_city_id) {
    const supabase = await createClient();
    const { data: city } = await supabase
      .from("cities")
      .select("name, country_code")
      .eq("id", profile.home_city_id)
      .maybeSingle();
    cityName = city ? `${city.name}, ${city.country_code}` : null;
  }

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
        </div>
      </header>

      <section className="mt-6">
        <AvailabilityToggle active={openToday} />
      </section>

      <section className="mt-6 rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold">Chess accounts</h2>
        <div className="mt-3">
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
          <a href="/api/link/lichess/start">
            <Button variant="outline" className="w-full">
              {profile.lichess_verified ? "Re-link Lichess" : "Link Lichess"}
            </Button>
          </a>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">chess.com</p>
            <ChesscomLink initialUsername={profile.chesscom_username} />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <BioEditor userId={profile.id} initialBio={profile.bio} />
      </section>

      <section className="mt-6">
        <LocationSettings currentCity={cityName} />
      </section>

      <section className="mt-6">
        <ShareButton
          title="WoodPushers"
          text="Find over-the-board chess near you: places to play and players to meet."
          label="Invite friends"
          className="w-full"
        />
      </section>

      <section className="mt-6">
        <VisibilityToggle visible={profile.visible} />
      </section>

      <form action="/auth/signout" method="post" className="mt-8">
        <Button variant="ghost" className="w-full text-muted-foreground">
          Sign out
        </Button>
      </form>
    </main>
  );
}
