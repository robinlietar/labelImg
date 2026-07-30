import { randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/config";

/**
 * chess.com has no public OAuth. We verify ownership with a code the user
 * pastes into their profile Location field, then read the public API. A proper
 * User-Agent is required or chess.com blocks the request.
 */
const UA = `ChessMates/0.1 (${SITE_URL})`;
const PUB = "https://api.chess.com/pub/player";

/** 6-char code, no ambiguous characters. */
export function makeVerifyCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function fetchChesscomPlayer(
  username: string,
): Promise<{ found: boolean; location: string | null }> {
  try {
    const res = await fetch(`${PUB}/${username.toLowerCase()}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return { found: false, location: null };
    const json = (await res.json()) as { location?: string };
    return { found: true, location: json.location ?? null };
  } catch {
    return { found: false, location: null };
  }
}

export type ChesscomProfile = {
  ratings: Record<string, number>;
  title: string | null;
  meta: {
    best: Record<string, number>;
    record: { win: number; loss: number; draw: number } | null;
    fide: number | null;
    country: string | null;
  };
};

/** Public profile: ratings plus title, best ratings, record, FIDE. */
export async function fetchChesscomProfile(
  username: string,
): Promise<ChesscomProfile> {
  const u = username.toLowerCase();
  const empty: ChesscomProfile = {
    ratings: {},
    title: null,
    meta: { best: {}, record: null, fide: null, country: null },
  };
  let pRes: Response, sRes: Response;
  try {
    [pRes, sRes] = await Promise.all([
      fetch(`${PUB}/${u}`, { headers: { "User-Agent": UA } }),
      fetch(`${PUB}/${u}/stats`, { headers: { "User-Agent": UA } }),
    ]);
  } catch {
    return empty;
  }
  if (!sRes.ok) return empty;
  const player = pRes.ok
    ? ((await pRes.json()) as { title?: string; country?: string })
    : {};
  const stats = (await sRes.json()) as Record<
    string,
    { last?: { rating?: number }; best?: { rating?: number }; record?: { win?: number; loss?: number; draw?: number } }
  > & { fide?: number };

  const map: Record<string, string> = {
    blitz: "chess_blitz",
    rapid: "chess_rapid",
    bullet: "chess_bullet",
    classical: "chess_daily",
  };
  const ratings: Record<string, number> = {};
  const best: Record<string, number> = {};
  let record: ChesscomProfile["meta"]["record"] = null;
  for (const [key, apiKey] of Object.entries(map)) {
    const node = stats[apiKey];
    if (typeof node?.last?.rating === "number") ratings[key] = node.last.rating;
    if (typeof node?.best?.rating === "number") best[key] = node.best.rating;
    if (!record && node?.record) {
      record = {
        win: node.record.win ?? 0,
        loss: node.record.loss ?? 0,
        draw: node.record.draw ?? 0,
      };
    }
  }
  return {
    ratings,
    title: player.title ?? null,
    meta: {
      best,
      record,
      fide: typeof stats.fide === "number" ? stats.fide : null,
      country: player.country ? player.country.split("/").pop() ?? null : null,
    },
  };
}

export async function fetchChesscomRatings(
  username: string,
): Promise<Record<string, number>> {
  const res = await fetch(`${PUB}/${username.toLowerCase()}/stats`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return {};
  const json = (await res.json()) as Record<
    string,
    { last?: { rating?: number } }
  >;
  const map: Record<string, string> = {
    blitz: "chess_blitz",
    rapid: "chess_rapid",
    bullet: "chess_bullet",
    classical: "chess_daily",
  };
  const out: Record<string, number> = {};
  for (const [key, apiKey] of Object.entries(map)) {
    const r = json[apiKey]?.last?.rating;
    if (typeof r === "number") out[key] = r;
  }
  return out;
}
