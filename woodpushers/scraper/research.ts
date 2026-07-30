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

type RawEvent = {
  title?: string;
  description?: string;
  venue_name?: string;
  date?: string;
  recurrence?: string;
  source_url?: string;
};

export type EventCandidate = {
  title: string;
  description: string | null;
  venue_name: string | null;
  starts_at: string | null;
  recurrence: string | null;
  source_url: string;
};

export type ResearchResult = {
  places: Candidate[];
  events: EventCandidate[];
};

function coerceKind(k: string | undefined): PlaceKind {
  const v = (k ?? "").toLowerCase().replace(/\s+/g, "_");
  return (PLACE_KINDS as readonly string[]).includes(v)
    ? (v as PlaceKind)
    : "other";
}

/**
 * One Claude call per city with web search. Returns real, currently operating
 * places to play OTB chess (casual venues first) AND the city's chess events:
 * regular nights and upcoming tournaments. One call feeds both tables.
 */
export async function fetchResearch(city: CityRow): Promise<ResearchResult> {
  const system = [
    "You are a local chess scout. Find real, currently operating places to",
    "play over-the-board chess in the given city, AND the city's chess events.",
    "",
    "PRIORITIZE CASUAL, SOCIAL venues: bars and pubs with chess nights, chess",
    "cafes, board game bars where chess is played, park and plaza scenes with",
    "regular players, casual meetup groups with a fixed venue. Federation",
    "clubs matter too but casual spots come first; a bar with a packed",
    "Tuesday chess night beats a members-only club.",
    "",
    "EVENTS: collect regular nights (e.g. a weekly casual meetup or blitz",
    "night) and upcoming tournaments or opens in the city, each with where",
    "and when.",
    "",
    "Use web search. Good sources, roughly in order: the country's national",
    "chess federation club directory (e.g. ECF club finder, FFE clubs, DSB",
    "Vereine, USCF club search, FIDE member federation sites), regional chess",
    "association listings, official club and venue websites, city subreddit and",
    "forum threads about where to play, meetup.com chess groups with a fixed",
    "venue, and recent local news or blog posts. Also worth trying:",
    "chess.com club pages and lichess team pages that name a physical venue,",
    "Wikipedia and Wikidata lists of chess clubs, Atlas Obscura and TimeOut",
    "style articles about where locals play, tournament calendars",
    "(federation event listings, chess-results.com venues used repeatedly),",
    "university chess society pages, and public park websites mentioning",
    "permanent chess tables. Prefer primary sources.",
    "Include nothing you cannot source with a URL. Do not invent addresses or",
    "coordinates: omit a field rather than guess.",
    "",
    "Return ONLY a JSON object (no prose, no code fence):",
    `{ "places": [up to 15 of { "name", "kind" (one of ${PLACE_KINDS.join("|")}),`,
    ` "address", "lat", "lng", "website", "source_url" (REQUIRED),`,
    ` "confidence" (0..1), "description" (one line) }],`,
    ` "events": [up to 10 of { "title", "description" (one line),`,
    ` "venue_name" (matching a place name above when possible),`,
    ` "date" (ISO 8601 with timezone, ONLY for one-off dated events),`,
    ` "recurrence" (human text like "Every Tuesday 19:00", ONLY for regular`,
    ` nights), "source_url" (REQUIRED) }] }.`,
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

  const parsed = parseJsonLoose<
    { places?: RawPlace[]; events?: RawEvent[] } | RawPlace[]
  >(textOf(message));
  // Tolerate the legacy bare-array shape.
  const rawPlaces = Array.isArray(parsed) ? parsed : (parsed?.places ?? []);
  const rawEvents = Array.isArray(parsed) ? [] : (parsed?.events ?? []);

  const places: Candidate[] = [];
  for (const p of rawPlaces) {
    if (!p.name || !p.source_url) continue; // source_url required
    places.push({
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

  const events: EventCandidate[] = [];
  for (const e of rawEvents) {
    if (!e.title || !e.source_url) continue;
    const starts =
      e.date && !Number.isNaN(Date.parse(e.date))
        ? new Date(e.date).toISOString()
        : null;
    events.push({
      title: e.title.slice(0, 140),
      description: e.description ?? null,
      venue_name: e.venue_name ?? null,
      starts_at: starts,
      recurrence: e.recurrence ?? null,
      source_url: e.source_url,
    });
  }
  return { places, events };
}
