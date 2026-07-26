import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Report a problem with a place. Stored in reports with a place reference. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { placeId, reason } = (await request.json()) as {
    placeId?: string;
    reason?: string;
  };
  if (!placeId || !reason) return NextResponse.json({ ok: false }, { status: 400 });

  await supabase
    .from("reports")
    .insert({ reporter: user.id, reported: null, reason: `place:${placeId} ${reason}` });
  return NextResponse.json({ ok: true });
}
