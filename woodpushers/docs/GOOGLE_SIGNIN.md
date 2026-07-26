# Enable Google sign-in (and fix magic-link redirects)

Two independent things must be configured. Both are dashboard-only, no code.

## A. Supabase URL configuration (do this first, it also fixes magic links)

1. Supabase Dashboard > your project > Authentication > URL Configuration.
2. Set **Site URL** to: `https://woodpushers.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://woodpushers.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)
4. Save. Without this, magic-link emails point at localhost and Google returns a redirect error.

## B. Google OAuth client

1. Go to https://console.cloud.google.com (any Google account).
2. Top bar project picker > **New project** > name it `woodpushers` > Create > select it.
3. Left menu > **APIs & Services** > **OAuth consent screen**:
   - User type: **External** > Create.
   - App name `WoodPushers`, support email: your email, developer contact: your email. Save through the remaining steps (no scopes needed beyond default).
   - Publishing status: click **Publish app** (leaving it in Testing limits sign-in to allowlisted emails).
4. **APIs & Services** > **Credentials** > **Create credentials** > **OAuth client ID**:
   - Application type: **Web application**, name `woodpushers-web`.
   - Authorized JavaScript origins: `https://lhvlaplmpjhkohftfcbi.supabase.co`
   - Authorized redirect URIs: `https://lhvlaplmpjhkohftfcbi.supabase.co/auth/v1/callback`
   - Create. Copy the **Client ID** and **Client secret**.
5. Supabase Dashboard > Authentication > Sign In / Providers > **Google**:
   - Enable, paste Client ID and Client secret, Save.
6. Test: open https://woodpushers.vercel.app/login in a private tab > Continue with Google.

## C. Vercel env sanity (once)

In Vercel > Project > Settings > Environment Variables confirm:

- `NEXT_PUBLIC_SITE_URL` = `https://woodpushers.vercel.app` (then Redeploy)
- `ANTHROPIC_API_KEY` is set
- `MAX_CITIES_PER_RUN` = `2` (keeps scraper cost near zero on a small credit)
