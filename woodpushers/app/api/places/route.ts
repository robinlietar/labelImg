import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ places: data ?? [] });
  } catch {
    // Before Supabase is wired up, return empty so the map still renders.
    return NextResponse.json({ places: [] });
  }
}
