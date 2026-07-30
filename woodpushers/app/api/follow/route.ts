import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Follow or unfollow a player. RLS enforces ownership and block pairs. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  let body: { profileId?: string; on?: boolean };
  try {
    body = (await request.json()) as { profileId?: string; on?: boolean };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!body.profileId || typeof body.on !== "boolean" || body.profileId === user.id) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const supabase = await createClient();
  if (body.on) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, followed_id: body.profileId });
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: "Could not follow." }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", body.profileId);
    if (error) {
      return NextResponse.json({ error: "Could not unfollow." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
