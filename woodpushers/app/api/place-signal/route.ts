import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** "I play here" signal. Idempotent per user + place. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let placeId: string | undefined;
  try {
    ({ placeId } = (await request.json()) as { placeId?: string });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!placeId) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase
    .from("place_signals")
    .upsert({ place_id: placeId, profile_id: user.id });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
