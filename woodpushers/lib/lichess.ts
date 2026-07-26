import { createHash, randomBytes } from "node:crypto";

/**
 * Lichess is a LINKED account, not a login provider. OAuth 2.0 with PKCE and a
 * public client (no secret). Authorize on lichess.org, exchange on
 * /api/token, read /api/account for the verified username.
 */
export const LICHESS = {
  authorize: "https://lichess.org/oauth",
  token: "https://lichess.org/api/token",
  account: "https://lichess.org/api/account",
  clientId: process.env.LICHESS_CLIENT_ID ?? "woodpushers-web",
};

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function makePkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function authorizeUrl(params: {
  challenge: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(LICHESS.authorize);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", LICHESS.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("code_challenge", params.challenge);
  u.searchParams.set("state", params.state);
  // No scopes: reading the public account username needs none.
  return u.toString();
}

export async function exchangeCode(params: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<string | null> {
  const res = await fetch(LICHESS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.verifier,
      redirect_uri: params.redirectUri,
      client_id: LICHESS.clientId,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function fetchAccount(token: string): Promise<string | null> {
  const res = await fetch(LICHESS.account, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { username?: string };
  return json.username ?? null;
}

/** Public ratings for a username. No auth needed. */
export async function fetchLichessRatings(
  username: string,
): Promise<Record<string, number>> {
  const res = await fetch(`https://lichess.org/api/user/${username}`, {
    headers: { "User-Agent": "WoodPushers/0.1" },
  });
  if (!res.ok) return {};
  const json = (await res.json()) as {
    perfs?: Record<string, { rating?: number }>;
  };
  const perfs = json.perfs ?? {};
  const out: Record<string, number> = {};
  for (const key of ["blitz", "rapid", "classical", "bullet"]) {
    const r = perfs[key]?.rating;
    if (typeof r === "number") out[key] = r;
  }
  return out;
}
