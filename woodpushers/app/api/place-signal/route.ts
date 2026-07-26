import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** "I play here" signal. Idempotent per user + place. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { placeId } = (await request.json()) as { placeId?: string };
  if (!placeId) return NextResponse.json({ ok: false }, { status: 400 });

  await supabase
    .from("place_signals")
    .upsert({ place_id: placeId, profile_id: user.id });
  return NextResponse.json({ ok: true });
}
