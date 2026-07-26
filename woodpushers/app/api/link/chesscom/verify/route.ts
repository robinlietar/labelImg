import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchChesscomPlayer, fetchChesscomProfile } from "@/lib/chesscom";

/** Check the code is in the Location field, then mark verified + pull ratings. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const jar = await cookies();
  const raw = jar.get("chesscom_link")?.value;
  if (!raw) return NextResponse.json({ verified: false, error: "start over" }, { status: 400 });

  let username: string, code: string;
  try {
    const parsed = JSON.parse(raw) as { username?: unknown; code?: unknown };
    if (typeof parsed.username !== "string" || typeof parsed.code !== "string")
      throw new Error("bad shape");
    username = parsed.username;
    code = parsed.code;
  } catch {
    jar.delete("chesscom_link");
    return NextResponse.json({ verified: false, error: "start over" }, { status: 400 });
  }
  const player = await fetchChesscomPlayer(username);
  if (!player.found)
    return NextResponse.json({ verified: false, error: "user not found" }, { status: 404 });

  const ok = (player.location ?? "").toUpperCase().includes(code.toUpperCase());
  if (!ok) {
    return NextResponse.json({
      verified: false,
      error: "code not found in your Location field yet",
    });
  }

  const profile = await fetchChesscomProfile(username);
  const svc = createServiceClient();
  await svc
    .from("profiles")
    .update({
      chesscom_username: username,
      chesscom_ratings: profile.ratings,
      chesscom_title: profile.title,
      chesscom_meta: profile.meta,
      chesscom_verified: true,
    })
    .eq("id", user.id);

  jar.delete("chesscom_link");
  return NextResponse.json({ verified: true });
}
