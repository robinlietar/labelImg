/**
 * Seed just the two launch cities (Sydney and Paris) with clean slugs, so the
 * pipeline can run before the full world-cities CSV is loaded:
 *   pnpm tsx scripts/seed-launch-cities.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createServiceClient } from "@/lib/supabase/service";

const LAUNCH = [
  { name: "Sydney", country_code: "AU", slug: "sydney", population: 5_312_000, lng: 151.2093, lat: -33.8688 },
  { name: "Paris", country_code: "FR", slug: "paris", population: 11_020_000, lng: 2.3522, lat: 48.8566 },
];

async function main() {
  const svc = createServiceClient();
  for (const c of LAUNCH) {
    const { error } = await svc.rpc("upsert_city", {
      p_name: c.name,
      p_country_code: c.country_code,
      p_slug: c.slug,
      p_population: c.population,
      p_lng: c.lng,
      p_lat: c.lat,
    });
    console.log(`${c.slug}: ${error ? `error ${error.message}` : "ok"}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
