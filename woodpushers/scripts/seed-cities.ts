/**
 * Seed the cities table from the simplemaps World Cities CSV (CC BY 4.0,
 * attributed in the README). Keeps cities with population >= 100k.
 *
 * Get the data: download the free "Basic" World Cities database from
 * https://simplemaps.com/data/world-cities and unzip worldcities.csv into
 * scripts/data/worldcities.csv (or pass a path / set WORLDCITIES_CSV).
 *
 *   pnpm seed:cities
 *   pnpm seed:cities path/to/worldcities.csv
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { createServiceClient } from "@/lib/supabase/service";
import { slugify } from "@/lib/geo";

const MIN_POPULATION = 100_000;

/** Minimal CSV parser that handles quoted fields with embedded commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

async function main() {
  const path =
    process.argv[2] ??
    process.env.WORLDCITIES_CSV ??
    "scripts/data/worldcities.csv";

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(
      `Could not read ${path}. Download the free World Cities CSV from ` +
        `https://simplemaps.com/data/world-cities and place worldcities.csv there.`,
    );
    process.exit(1);
  }

  const rows = parseCsv(text);
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const iName = idx("city_ascii") >= 0 ? idx("city_ascii") : idx("city");
  const iLat = idx("lat");
  const iLng = idx("lng");
  const iIso2 = idx("iso2");
  const iPop = idx("population");

  const svc = createServiceClient();
  let inserted = 0;
  const seenSlugs = new Set<string>();

  for (const r of rows.slice(1)) {
    const pop = Number(r[iPop]);
    if (!Number.isFinite(pop) || pop < MIN_POPULATION) continue;
    const name = r[iName]?.trim();
    const lat = Number(r[iLat]);
    const lng = Number(r[iLng]);
    const iso2 = r[iIso2]?.trim().toUpperCase();
    if (!name || !iso2 || !Number.isFinite(lat) || !Number.isFinite(lng))
      continue;

    let slug = slugify(`${name}-${iso2}`);
    // Disambiguate rare slug collisions (same city name and country).
    let n = 2;
    while (seenSlugs.has(slug)) slug = slugify(`${name}-${iso2}-${n++}`);
    seenSlugs.add(slug);

    const { error } = await svc.rpc("upsert_city", {
      p_name: name,
      p_country_code: iso2,
      p_slug: slug,
      p_population: Math.round(pop),
      p_lng: lng,
      p_lat: lat,
    });
    if (!error) inserted++;
    if (inserted % 500 === 0 && inserted) console.log(`  ${inserted} cities...`);
  }

  console.log(`Seeded ${inserted} cities (population >= ${MIN_POPULATION}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
