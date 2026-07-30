import { NextResponse } from "next/server";
import { runScrape } from "@/scraper/run";
import { enrichPlaces } from "@/lib/enrich-places";

// Give the run a wall-clock budget under the platform function limit, then
// exit cleanly. The daily schedule cycles the city list forever.
export const maxDuration = 300; // seconds (raise/lower to your Vercel plan)

// Vercel cron fires GET; the acceptance-checklist curl uses POST. Same handler.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Fail closed: an unset secret must never mean an open endpoint.
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const started = Date.now();
    const { runId, summaries } = await runScrape({
      timeBudgetMs: 3.5 * 60 * 1000, // leave headroom under maxDuration
    });
    // Hobby plans allow only two cron jobs, so Google enrichment rides on
    // the nightly scrape with whatever wall clock is left.
    const remainingMs = 4.5 * 60 * 1000 - (Date.now() - started);
    const enriched =
      remainingMs > 45_000
        ? await enrichPlaces(20, Date.now() + remainingMs)
        : null;
    return NextResponse.json({ ok: true, runId, summaries, enriched });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}

export { handle as GET, handle as POST };
