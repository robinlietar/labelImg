import { NextResponse } from "next/server";
import { enrichPlaces } from "@/lib/enrich-places";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (raise/lower to your Vercel plan)

const PER_RUN = Number(process.env.MAX_ENRICH_PER_RUN ?? 25);

async function run(request: Request) {
  // Fail closed: no secret configured means no unauthenticated cron access.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await enrichPlaces(PER_RUN);
  return NextResponse.json(result);
}

// Vercel cron fires GET; manual/CI calls may POST.
export const GET = run;
export const POST = run;
