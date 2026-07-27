import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on navigation so Server
 * Components always see a fresh session. Skips static assets.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // During Phase 0/1 before env is set, do nothing.
  if (!url || !anon) return response;

  // API calls carry their own auth and do not need a session refresh round
  // trip; refreshing on page navigations is enough. This shaves a network
  // hop off every /api/* request (the unread poll, places viewport, etc).
  if (request.nextUrl.pathname.startsWith("/api/")) return response;

  // The auth round trip below exists only to refresh a near-expiry session
  // cookie. While the access token is comfortably fresh, skip it: pages
  // verify the JWT locally themselves. This removes the blocking network
  // hop from almost every navigation.
  try {
    const chunks = request.cookies
      .getAll()
      .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.value)
      .join("");
    if (chunks) {
      const raw = chunks.startsWith("base64-") ? chunks.slice(7) : chunks;
      const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
      const session = JSON.parse(json) as { expires_at?: number };
      if (
        session.expires_at &&
        session.expires_at * 1000 - Date.now() > 5 * 60 * 1000
      ) {
        return response;
      }
    }
  } catch {
    // Unparseable cookie: fall through to the full refresh below.
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Supabase being unreachable must never take the whole site down;
    // pages will simply see no session until it recovers.
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
