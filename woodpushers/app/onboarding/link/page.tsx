import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { ChesscomLink } from "@/components/profile/ChesscomLink";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Link your chess accounts" };

/** Onboarding step 2: link at least one account, or skip. */
export default async function OnboardingLinkPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Step 2 of 2
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Link a chess account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Verified ratings help others find the right opponent. Takes under a
        minute, and you can do it later from your profile.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <div className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">Lichess</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One tap, verified through Lichess itself.
          </p>
          <a href="/api/link/lichess/start" className="mt-3 block">
            <Button variant="outline" className="w-full">
              {profile.lichess_verified ? "Linked ✓" : "Link Lichess"}
            </Button>
          </a>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">chess.com</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified with a one-time code in your profile Location field.
          </p>
          <div className="mt-3">
            <ChesscomLink initialUsername={profile.chesscom_username} />
          </div>
        </div>

        <Link href="/players" className="text-center text-sm text-muted-foreground underline">
          Skip for now
        </Link>
      </div>
    </main>
  );
}
