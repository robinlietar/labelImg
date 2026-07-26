import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Record demand for a city chat where none exists yet. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let cityId: number | undefined;
  try {
    ({ cityId } = (await request.json()) as { cityId?: number });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!cityId) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase
    .from("city_chat_requests")
    .upsert({ city_id: cityId, requested_by: user.id });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
