import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fixturesInBbox } from "@/lib/fixtures";
import { isOpenNow, type StoredHours } from "@/lib/hours";

/**
 * Approved places within a map viewport. Public. Returns GeoJSON-ish points
 * the client clusters with supercluster.
 *   /api/places?west=..&south=..&east=..&north=..&kinds=club,cafe
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nums = ["west", "south", "east", "north"].map((k) =>
    Number(searchParams.get(k)),
  );
  if (nums.some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "bad bbox" }, { status: 400 });
  }
  const [west, south, east, north] = nums;
  const kindsParam = searchParams.get("kinds");
  const kinds = kindsParam ? kindsParam.split(",").filter(Boolean) : null;

  // Local dev without Supabase configured: serve demo pins so the map is
  // never empty. Never active in a configured deployment.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      places: fixturesInBbox(west, south, east, north, kinds),
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("places_in_bbox", {
      west,
      south,
      east,
      north,
      kinds,
    });
    if (error) throw error;
    // Compute open-now server-side and drop the raw hours: pins stay small.
    const places = ((data ?? []) as Array<Record<string, unknown>>).map(
      ({ opening_hours, ...p }) => ({
        ...p,
        open_now: isOpenNow(opening_hours as StoredHours | null),
      }),
    );
    return NextResponse.json({ places });
  } catch {
    // Before Supabase is wired up, return empty so the map still renders.
    return NextResponse.json({ places: [] });
  }
}
