import Link from "next/link";
import { getUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayersFilters } from "@/components/players/PlayersFilters";
import type { PlayerRow } from "@/lib/players";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Players" };

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getUser();
  if (!user) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-10 text-center">
        <h1 className="text-xl font-semibold">Players nearby</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to see players near you and propose a game.
        </p>
        <Link href="/login" className="mt-4 inline-block">
          <Button>Sign in</Button>
        </Link>
      </main>
    );
  }
  const profile = await getProfile();
  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-md px-5 pb-28 pt-10 text-center">
        <p className="text-sm text-muted-foreground">Finish setting up first.</p>
        <Link href="/onboarding" className="mt-4 inline-block">
          <Button>Set up profile</Button>
        </Link>
      </main>
    );
  }

  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("players_nearby", {
    radius_km: Number(sp.radius ?? 25),
    min_rating: sp.min ? Number(sp.min) : null,
    max_rating: sp.max ? Number(sp.max) : null,
    time_control: sp.tc || null,
    availability: sp.availability || null,
    active_within_hours: sp.active === "1" ? 168 : null,
  });
  const players = (data ?? []) as PlayerRow[];

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      <h1 className="text-xl font-semibold">Players nearby</h1>
      <div className="mt-3">
        <PlayersFilters />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {players.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No players match yet. Widen the radius, or invite your chess friends.
          </p>
        ) : (
          players.map((p) => <PlayerCard key={p.id} player={p} />)
        )}
      </div>
    </main>
  );
}
