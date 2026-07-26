import { NextResponse } from "next/server";
import { refreshAllLinked } from "@/lib/refresh-ratings";

export const maxDuration = 300;

/**
 * Daily ratings refresh for every profile with a linked chess account.
 * Vercel cron fires GET; manual runs use POST. Both share the handler.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fail closed: an unset secret must never mean an open endpoint.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const refreshed = await refreshAllLinked();
  return NextResponse.json({ ok: true, refreshed });
}

export { handle as GET, handle as POST };
