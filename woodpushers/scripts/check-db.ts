import { config } from "dotenv";
config({ path: ".env.local" });
import { createServiceClient } from "@/lib/supabase/service";

async function main() {
  const svc = createServiceClient();

  const tables = ["cities", "places", "profiles", "scrape_runs"];
  for (const t of tables) {
    const { count, error } = await svc
      .from(t)
      .select("*", { count: "exact", head: true });
    console.log(`table ${t}: ${error ? `ERROR ${error.message}` : `ok (${count} rows)`}`);
  }

  const rpcs: Array<[string, Record<string, unknown>]> = [
    ["next_cities_to_scrape", { max_count: 1 }],
    ["places_in_bbox", { west: 0, south: 0, east: 1, north: 1, kinds: null }],
  ];
  for (const [fn, args] of rpcs) {
    const { error } = await svc.rpc(fn, args);
    console.log(`rpc ${fn}: ${error ? `ERROR ${error.message}` : "ok"}`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
