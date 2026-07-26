import { sleep } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/config";

/**
 * Nominatim geocoder. Usage policy: max 1 request/second, a real User-Agent.
 * We serialize all calls through a single promise chain to hold the 1 req/s
 * limit process-wide, and only ever call it for entries missing coordinates.
 */
const USER_AGENT = `WoodPushers/0.1 (${SITE_URL})`;

let chain: Promise<unknown> = Promise.resolve();

export function geocode(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const run = chain.then(async () => {
    await sleep(1100); // stay under 1 req/s with margin
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) return null;
      const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!arr.length) return null;
      return { lat: Number(arr[0].lat), lng: Number(arr[0].lon) };
    } catch {
      return null;
    }
  });
  // Keep the chain alive regardless of individual failures.
  chain = run.catch(() => undefined);
  return run;
}
