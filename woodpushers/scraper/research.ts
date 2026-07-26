import { anthropic, MODELS, parseJsonLoose, textOf } from "@/lib/anthropic";
import { PLACE_KINDS, type PlaceKind } from "@/lib/places";
import type { Candidate, CityRow } from "./types";

// Server-side web search tool. Verify this tool version is current against
// https://docs.claude.com/en/docs/intro before shipping.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
} as const;

type RawPlace = {
  name?: string;
  kind?: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  source_url?: string;
  confidence?: number;
  description?: string;
};

function coerceKind(k: string | undefined): PlaceKind {
  const v = (k ?? "").toLowerCase().replace(/\s+/g, "_");
  return (PLACE_KINDS as readonly string[]).includes(v)
    ? (v as PlaceKind)
    : "other";
}

/**
 * One Claude call per city with web search. Returns up to 15 real, currently
 * operating places to play OTB chess, each with a required source_url.
 */
export async function fetchResearch(city: CityRow): Promise<Candidate[]> {
  const system = [
    "You are a local chess scout. Find real, currently operating places to",
    "play over-the-board chess in the given city: clubs, chess cafes, bars",
    "with regular chess, park tables, libraries, community centers, tournament",
    "venues, shops with play space.",
    "",
    "Use web search. Prefer official club sites, venue sites, and recent posts.",
    "Include nothing you cannot source with a URL. Do not invent addresses or",
    "coordinates: omit a field rather than guess.",
    "",
    "Return ONLY a JSON array (no prose, no code fence) of up to 15 objects:",
    `{ "name", "kind" (one of ${PLACE_KINDS.join("|")}), "address", "lat",`,
    ` "lng", "website", "source_url" (REQUIRED), "confidence" (0..1),`,
    ` "description" (one line) }.`,
  ].join("\n");

  const message = await anthropic().messages.create({
    model: MODELS.cityResearch,
    max_tokens: 4096,
    system,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: "user",
        content: `City: ${city.name}, country ${city.country_code}.`,
      },
    ],
  });

  const parsed = parseJsonLoose<RawPlace[]>(textOf(message));
  if (!Array.isArray(parsed)) return [];

  const out: Candidate[] = [];
  for (const p of parsed) {
    if (!p.name || !p.source_url) continue; // source_url required
    out.push({
      name: p.name,
      kind: coerceKind(p.kind),
      description: p.description ?? null,
      address: p.address ?? null,
      website: p.website ?? null,
      lat: typeof p.lat === "number" ? p.lat : null,
      lng: typeof p.lng === "number" ? p.lng : null,
      source: "claude_research",
      source_url: p.source_url,
      confidence:
        typeof p.confidence === "number"
          ? Math.max(0, Math.min(1, p.confidence))
          : 0.5,
    });
  }
  return out;
}
