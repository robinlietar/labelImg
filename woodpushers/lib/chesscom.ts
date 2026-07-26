import { randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/config";

/**
 * chess.com has no public OAuth. We verify ownership with a code the user
 * pastes into their profile Location field, then read the public API. A proper
 * User-Agent is required or chess.com blocks the request.
 */
const UA = `WoodPushers/0.1 (${SITE_URL})`;
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
  const res = await fetch(`${PUB}/${username.toLowerCase()}`, {
    headers: { "User-Agent": UA },
  });
  if (res.status === 404) return { found: false, location: null };
  if (!res.ok) return { found: false, location: null };
  const json = (await res.json()) as { location?: string };
  return { found: true, location: json.location ?? null };
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
