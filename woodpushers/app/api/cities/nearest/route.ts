import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Nearest known city to a coordinate: /api/cities/nearest?lng=..&lat=.. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lng = Number(searchParams.get("lng"));
  const lat = Number(searchParams.get("lat"));
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    return NextResponse.json({ city: null }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("nearest_city", {
      p_lng: lng,
      p_lat: lat,
    });
    if (error) throw error;
    return NextResponse.json({ city: data?.[0] ?? null });
  } catch {
    return NextResponse.json({ city: null });
  }
}
