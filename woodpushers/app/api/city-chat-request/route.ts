import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Record demand for a city chat where none exists yet. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { cityId } = (await request.json()) as { cityId?: number };
  if (!cityId) return NextResponse.json({ ok: false }, { status: 400 });

  await supabase
    .from("city_chat_requests")
    .upsert({ city_id: cityId, requested_by: user.id });
  return NextResponse.json({ ok: true });
}
