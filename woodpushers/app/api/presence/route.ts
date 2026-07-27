import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Presence ping. Client throttles to once per 5 minutes. Updates last_seen_at. */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });
    await supabase.rpc("touch_presence");
    return NextResponse.json({ ok: true });
  } catch {
    // Presence is fire-and-forget; degrade silently.
    return NextResponse.json({ ok: false });
  }
}
