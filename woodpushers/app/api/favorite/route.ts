import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Toggle a place favorite for the signed-in user. RLS scopes every row. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  let body: { placeId?: string; on?: boolean };
  try {
    body = (await request.json()) as { placeId?: string; on?: boolean };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.placeId || typeof body.on !== "boolean") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  if (body.on) {
    const { error } = await supabase
      .from("place_favorites")
      .insert({ user_id: user.id, place_id: body.placeId });
    // Already favorited is a success, not an error.
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("place_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("place_id", body.placeId);
    if (error) {
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
