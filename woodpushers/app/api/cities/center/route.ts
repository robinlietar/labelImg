import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * City centroid by id: /api/cities/center?id=42. Used by the map to center on
 * the home city off the critical render path (only when there is no saved
 * viewport yet).
 */
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ center: null }, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: city } = await supabase
      .from("cities")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (!city?.slug) return NextResponse.json({ center: null });
    const { data } = await supabase.rpc("city_detail", { p_slug: city.slug });
    const c = data?.[0] as { lng: number; lat: number } | undefined;
    return NextResponse.json({
      center: c ? { lng: c.lng, lat: c.lat } : null,
    });
  } catch {
    return NextResponse.json({ center: null });
  }
}
