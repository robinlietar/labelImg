import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeCode, fetchAccount, fetchLichessProfile } from "@/lib/lichess";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const jar = await cookies();
  const verifier = jar.get("lichess_verifier")?.value;
  const savedState = jar.get("lichess_state")?.value;
  jar.delete("lichess_verifier");
  jar.delete("lichess_state");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/me?link=lichess_${reason}`, request.url));

  if (!code || !verifier || !state || state !== savedState) return fail("error");

  const redirectUri = new URL("/api/link/lichess/callback", request.url).toString();
  const token = await exchangeCode({ code, verifier, redirectUri });
  if (!token) return fail("error");

  const username = await fetchAccount(token);
  if (!username) return fail("error");

  const profile = await fetchLichessProfile(username);

  const svc = createServiceClient();
  await svc
    .from("profiles")
    .update({
      lichess_username: username,
      lichess_ratings: profile.ratings,
      lichess_title: profile.title,
      lichess_meta: profile.meta,
      lichess_verified: true,
    })
    .eq("id", user.id);

  return NextResponse.redirect(new URL("/me?link=lichess_ok", request.url));
}
