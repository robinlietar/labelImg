import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Report a problem with a place. Stored in reports with a place reference. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let placeId: string | undefined, reason: string | undefined;
  try {
    ({ placeId, reason } = (await request.json()) as {
      placeId?: string;
      reason?: string;
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!placeId || !reason) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    reporter: user.id,
    reported: null,
    reason: `place:${placeId} ${reason}`.slice(0, 1200),
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
