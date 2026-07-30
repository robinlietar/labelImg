import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { enrichPlaces } from "@/lib/enrich-places";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Admin-triggered Google enrichment pass, for instant results after setup. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const retryUnmatched = await request
    .json()
    .then((b) => (b as { retryUnmatched?: boolean })?.retryUnmatched === true)
    .catch(() => false);
  const result = await enrichPlaces(30, Date.now() + 4 * 60 * 1000, {
    retryUnmatched,
  });
  return NextResponse.json(result);
}
