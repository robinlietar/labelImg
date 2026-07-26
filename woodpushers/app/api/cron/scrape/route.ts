import { NextResponse } from "next/server";
import { runScrape } from "@/scraper/run";

// Give the run a wall-clock budget under the platform function limit, then
// exit cleanly. The daily schedule cycles the city list forever.
export const maxDuration = 300; // seconds (raise/lower to your Vercel plan)

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { runId, summaries } = await runScrape({
      timeBudgetMs: 4 * 60 * 1000, // leave headroom under maxDuration
    });
    return NextResponse.json({ ok: true, runId, summaries });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
