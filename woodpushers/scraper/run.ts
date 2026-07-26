import { createServiceClient } from "@/lib/supabase/service";
import { geocode } from "@/lib/nominatim";
import { fetchOsm } from "./osm";
import { fetchResearch } from "./research";
import { dedupeWithinBatch, isDuplicate, type ExistingPlace } from "./dedupe";
import type { Candidate, CityRow, CityRunSummary } from "./types";

type SupabaseClient = ReturnType<typeof createServiceClient>;

export type RunOptions = {
  slugs?: string[]; // manual run for named cities
  maxCities?: number; // default from env MAX_CITIES_PER_RUN
  timeBudgetMs?: number; // wall-clock budget for cron
};

async function selectCities(
  svc: SupabaseClient,
  opts: RunOptions,
): Promise<CityRow[]> {
  if (opts.slugs?.length) {
    const { data } = await svc.rpc("cities_by_slugs", { slugs: opts.slugs });
    return (data ?? []) as CityRow[];
  }
  const max = opts.maxCities ?? Number(process.env.MAX_CITIES_PER_RUN ?? 10);
  const { data } = await svc.rpc("next_cities_to_scrape", { max_count: max });
  return (data ?? []) as CityRow[];
}

/** Decide publish vs admin queue. OSM and high-confidence sourced entries go live. */
function statusFor(c: Candidate): "approved" | "pending" {
  return c.confidence >= 0.8 && !!c.source_url ? "approved" : "pending";
}

async function processCity(
  svc: SupabaseClient,
  city: CityRow,
): Promise<CityRunSummary> {
  const summary: CityRunSummary = {
    city_id: city.id,
    slug: city.slug,
    osm_found: 0,
    claude_found: 0,
    inserted: 0,
    skipped_dupes: 0,
  };

  // Two sources, each isolated so one failing does not lose the other.
  let osm: Candidate[] = [];
  let research: Candidate[] = [];
  try {
    osm = await fetchOsm(city);
  } catch (e) {
    summary.error = `osm: ${(e as Error).message}`;
  }
  try {
    research = await fetchResearch(city);
  } catch (e) {
    summary.error = [summary.error, `research: ${(e as Error).message}`]
      .filter(Boolean)
      .join("; ");
  }
  summary.osm_found = osm.length;
  summary.claude_found = research.length;

  let candidates = dedupeWithinBatch([...osm, ...research]);

  // Geocode entries still missing coordinates (Nominatim, 1 req/s). Drop the
  // ones that still cannot be placed.
  for (const c of candidates) {
    if (c.lat == null || c.lng == null) {
      const q = [c.name, c.address, city.name, city.country_code]
        .filter(Boolean)
        .join(", ");
      const g = await geocode(q);
      if (g) {
        c.lat = g.lat;
        c.lng = g.lng;
      }
    }
  }
  candidates = candidates.filter((c) => c.lat != null && c.lng != null);

  // Dedupe against what is already stored for this city.
  const { data: existingRows } = await svc.rpc("places_for_dedupe", {
    p_city_id: city.id,
  });
  const existing = (existingRows ?? []) as ExistingPlace[];

  for (const c of candidates) {
    if (isDuplicate(c, existing)) {
      summary.skipped_dupes++;
      continue;
    }
    const { data: newId, error } = await svc.rpc("insert_scraped_place", {
      p_name: c.name,
      p_kind: c.kind,
      p_description: c.description ?? null,
      p_address: c.address ?? null,
      p_city_id: city.id,
      p_lng: c.lng,
      p_lat: c.lat,
      p_website: c.website ?? null,
      p_opening_notes: c.opening_notes ?? null,
      p_source: c.source,
      p_source_url: c.source_url ?? null,
      p_confidence: c.confidence,
      p_status: statusFor(c),
    });
    if (error || !newId) continue;
    summary.inserted++;
    // Add to the in-memory set so later candidates dedupe against it too.
    existing.push({
      name: c.name,
      website: c.website ?? null,
      lng: c.lng!,
      lat: c.lat!,
    });
  }

  await svc.rpc("mark_city_scraped", { p_city_id: city.id });
  return summary;
}

/** Run the discovery pipeline. Never lets one city kill the whole run. */
export async function runScrape(opts: RunOptions = {}): Promise<{
  runId: string | null;
  summaries: CityRunSummary[];
}> {
  const svc = createServiceClient();
  const startedAt = Date.now();

  const { data: runRow } = await svc
    .from("scrape_runs")
    .insert({})
    .select("id")
    .single();
  const runId = runRow?.id ?? null;

  const cities = await selectCities(svc, opts);
  const summaries: CityRunSummary[] = [];

  for (const city of cities) {
    if (opts.timeBudgetMs && Date.now() - startedAt > opts.timeBudgetMs) break;
    try {
      summaries.push(await processCity(svc, city));
    } catch (e) {
      summaries.push({
        city_id: city.id,
        slug: city.slug,
        osm_found: 0,
        claude_found: 0,
        inserted: 0,
        skipped_dupes: 0,
        error: (e as Error).message,
      });
    }
  }

  if (runId) {
    await svc
      .from("scrape_runs")
      .update({ finished_at: new Date().toISOString(), cities: summaries })
      .eq("id", runId);
  }
  return { runId, summaries };
}
