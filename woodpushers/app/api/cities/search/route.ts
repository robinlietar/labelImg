import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Typeahead search over cities for onboarding and the map search box. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ cities: [] });
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cities")
      .select("id, name, country_code, slug, population")
      .ilike("name", `${q}%`)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(8);
    return NextResponse.json({ cities: data ?? [] });
  } catch {
    return NextResponse.json({ cities: [] });
  }
}
