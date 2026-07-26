import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { RatingBadges } from "@/components/profile/RatingBadges";
import { ChesscomLink } from "@/components/profile/ChesscomLink";
import { AvailabilityToggle } from "@/components/profile/AvailabilityToggle";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Me" };

export default async function MePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  const openToday =
    !!profile.open_today_until &&
    new Date(profile.open_today_until).getTime() > Date.now();

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-8">
      <header className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-2xl">
          ♟
        </div>
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
            chesscomUsername={profile.chesscom_username}
            chesscomRatings={profile.chesscom_ratings}
            chesscomVerified={profile.chesscom_verified}
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
