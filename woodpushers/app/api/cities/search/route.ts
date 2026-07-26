import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CityHit = {
  id: number;
  name: string;
  country_code: string;
  slug: string;
  population: number | null;
  lng: number;
  lat: number;
};

const DEV_CITIES: CityHit[] = [
  { id: 1, name: "Sydney", country_code: "AU", slug: "sydney", population: 5312000, lng: 151.2093, lat: -33.8688 },
  { id: 2, name: "Paris", country_code: "FR", slug: "paris", population: 11020000, lng: 2.3522, lat: 48.8566 },
];

/** Typeahead over cities with coordinates, for onboarding and the map. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cities: [] });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({
      cities: DEV_CITIES.filter((c) =>
        c.name.toLowerCase().startsWith(q.toLowerCase()),
      ),
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_cities", {
      q,
      max_count: 8,
    });
    if (error) throw error;
    return NextResponse.json({ cities: data ?? [] });
  } catch {
    return NextResponse.json({ cities: [] });
  }
}
