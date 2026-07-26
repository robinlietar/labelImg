# WoodPushers

Over-the-board chess, anywhere in the world. A mobile-first web app with three pillars:

1. **The Map**: every place on Earth where you can play OTB chess, discovered city by city and enriched by user submissions.
2. **The Players**: a directory of nearby players filtered by strength, availability, and recent activity. Direct messaging, no swiping, no matching.
3. **The City Chats**: one WhatsApp community chat per city, surfaced on each city page.

Launch cities: Sydney and Paris.

## Stack

Next.js 15 (App Router, TypeScript strict), Tailwind + shadcn/ui, Supabase (Postgres + PostGIS, Auth, RLS, Realtime, Storage), MapLibre GL via react-map-gl with OpenFreeMap tiles, Anthropic API for city research and submission assessment. Deployed on Vercel. PWA installable, structured for a later Capacitor wrap.

## Local setup

```bash
pnpm install
cp .env.example .env.local   # fill in real values, never commit .env.local
pnpm dev
```

Open http://localhost:3000.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`: Next.js.
- `pnpm typecheck`: strict TypeScript, no emit.
- `pnpm seed:cities`: load the world cities seed (population >= 100k) from a CSV.
- `pnpm tsx scripts/seed-launch-cities.ts`: seed just Sydney and Paris.
- `pnpm tsx scripts/check-db.ts`: verify the DB connection and schema.
- `pnpm scrape --city sydney --city paris`: run the discovery pipeline for named cities.

## First run against Supabase

The discovery pipeline needs outbound access to `*.supabase.co`,
`overpass-api.de`, and `nominatim.openstreetmap.org`. Run it from a machine
with open network access:

```bash
pnpm install
cp .env.example .env.local        # fill in the real keys
# Apply the schema: paste supabase/all.sql into Supabase SQL Editor and Run.
pnpm tsx scripts/check-db.ts       # expect "ok" for every table and rpc
pnpm tsx scripts/seed-launch-cities.ts
pnpm scrape --city sydney --city paris
```

## Deploy (Vercel)

1. Import the repo in Vercel, set the project **Root Directory** to `woodpushers/`.
2. Add every variable from `.env.example` in Project Settings > Environment Variables.
3. Deploy. The `vercel.json` cron calls `POST /api/cron/scrape` daily at 03:00 UTC.

## Scheduler

Two schedulers are provided; enable exactly one.

- **Vercel cron** (`vercel.json`): default, active. Runs inside the plan's function duration limit with a wall-clock budget.
- **GitHub Actions** (`.github/workflows/scrape.yml`): fallback if the Vercel plan's duration limit is too tight. Disabled by default; set `CRON_SECRET` and `SITE_URL` repo secrets and enable it in the Actions tab, then disable the Vercel cron.

## Acceptance checklist

Keep this true as the app grows.

1. Live URL loads the map in under 3 s on a phone; Sydney and Paris show real, recognizable chess places.
2. Sign in with Google works on the live URL; onboarding completes in under 2 minutes.
3. Lichess link pulls real ratings; chess.com code verification works end to end.
4. Two accounts can find each other via filters (10 km, rating band) and exchange realtime messages.
5. A submitted place shows a Claude assessment in `/admin` within 30 s; approving publishes it to the map.
6. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $URL/api/cron/scrape` processes cities, writes a `scrape_runs` row, and new places appear.
7. The daily schedule ran unattended at least once, visible in admin.
8. Add to Home Screen works on iOS Safari and Android Chrome.

## Data attribution

- City seed data: [simplemaps World Cities Database](https://simplemaps.com/data/world-cities), licensed CC BY 4.0.
- Map places: OpenStreetMap contributors (via Overpass), open web research, and user submissions.
- Map tiles: [OpenFreeMap](https://openfreemap.org).

## Privacy

Exact user coordinates are never exposed. Location is stored coarse (rounded, or the home city centroid) and only shown as distance bands. No age, gender, or relationship fields anywhere: this is structural, keep it.

## Build phases

Built in checkpointed phases: 0 plumbing, 1 map and places, 2 identity, 3 players and chat, 4 community loop, 5 automation and polish. See the build spec for detail.
