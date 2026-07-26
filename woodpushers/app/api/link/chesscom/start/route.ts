import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchChesscomPlayer, makeVerifyCode } from "@/lib/chesscom";

/**
 * Begin chess.com linking. Stores the username immediately (unverified) and
 * returns a code to paste into the profile Location field.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { username } = (await request.json()) as { username?: string };
  const handle = username?.trim();
  if (!handle) return NextResponse.json({ error: "username required" }, { status: 400 });

  const player = await fetchChesscomPlayer(handle);
  if (!player.found)
    return NextResponse.json({ error: "no such chess.com user" }, { status: 404 });

  const code = makeVerifyCode();
  const svc = createServiceClient();
  await svc
    .from("profiles")
    .update({ chesscom_username: handle, chesscom_verified: false })
    .eq("id", user.id);

  const jar = await cookies();
  jar.set("chesscom_link", JSON.stringify({ username: handle, code }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 1800,
    path: "/",
  });

  return NextResponse.json({ code, username: handle });
}
