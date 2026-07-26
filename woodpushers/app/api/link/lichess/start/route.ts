import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getUser } from "@/lib/auth";
import { authorizeUrl, makePkce } from "@/lib/lichess";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { verifier, challenge } = makePkce();
  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/link/lichess/callback", request.url).toString();

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  jar.set("lichess_verifier", verifier, opts);
  jar.set("lichess_state", state, opts);

  return NextResponse.redirect(authorizeUrl({ challenge, redirectUri, state }));
}
