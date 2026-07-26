/**
 * Manual scrape runner.
 *   pnpm scrape --city sydney --city paris
 *   pnpm scrape --max 5
 * Loads .env.local, then runs the same pipeline the cron uses.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { runScrape } from "@/scraper/run";

function parseArgs(argv: string[]) {
  const slugs: string[] = [];
  let max: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--city" && argv[i + 1]) slugs.push(argv[++i]);
    else if (argv[i] === "--max" && argv[i + 1]) max = Number(argv[++i]);
  }
  return { slugs, max };
}

async function main() {
  const { slugs, max } = parseArgs(process.argv.slice(2));
  console.log(
    slugs.length
      ? `Scraping cities: ${slugs.join(", ")}`
      : `Scraping next ${max ?? process.env.MAX_CITIES_PER_RUN ?? 10} cities`,
  );
  const { runId, summaries } = await runScrape({
    slugs: slugs.length ? slugs : undefined,
    maxCities: max,
  });
  console.log(`Run ${runId ?? "(no id)"} finished:`);
  for (const s of summaries) {
    console.log(
      `  ${s.slug}: osm=${s.osm_found} research=${s.claude_found} ` +
        `inserted=${s.inserted} dupes=${s.skipped_dupes}` +
        (s.error ? ` error=${s.error}` : ""),
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
