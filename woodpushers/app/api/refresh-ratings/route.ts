import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { refreshRatingsByUserId } from "@/lib/refresh-ratings";

/** Self-service ratings resync from /me. */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  await refreshRatingsByUserId(user.id);
  return NextResponse.json({ ok: true });
}
