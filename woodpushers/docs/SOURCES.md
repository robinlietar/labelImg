# Place data sources

Where WoodPushers place data comes from, and directories worth feeding from.
Legality rule from the spec: no scraping of other apps' proprietary databases.
Federation directories and open data are fair game.

## Automated today

- **OpenStreetMap via Overpass**: `sport=chess`, `club=chess`, and chess-named
  cafes/bars/libraries. Free, worldwide, refreshed on every city scrape.
- **Claude web research** (daily cron): per-city search with mandatory source
  URLs. The prompt steers it to federation directories first (see below).
- **User submissions** with Claude pre-assessment.
- **Editorial seeds** (`supabase/seed-places-*.sql`): curated from knowledge,
  confidence-labeled, admin-reviewable.

## Directories the research pass is pointed at

National federation club directories are the richest structured source:

- England: ECF club finder (englishchess.org.uk)
- France: FFE club directory (echecs.asso.fr)
- Germany: DSB Vereinssuche (schachbund.de)
- USA: US Chess club search (uschess.org)
- Australia: ACF affiliated clubs and state associations (auschess.org.au)
- Netherlands: KNSB club list (schaakbond.nl)
- Spain: FEDA and regional federations (feda.org)
- Italy: FSI club list (federscacchi.it)
- Switzerland: SSB/FSE clubs (swisschess.ch)
- Nordics: SSF (schack.se), DSU (skak.dk), NSF (sjakk.no)
- FIDE member federation index (fide.com) for everywhere else

Plus: meetup.com chess groups with fixed venues, lichess team pages and
chess.com club pages that publish a physical venue, city subreddits,
Wikipedia/Wikidata lists of chess clubs, Atlas Obscura and TimeOut style
"where to play chess" articles, tournament calendars (federation event
listings, chess-results.com repeat venues), university chess societies, and
park authority pages that mention permanent chess tables.

## Automated with Google Places (needs GOOGLE_PLACES_API_KEY)

- **Discovery**: two text searches per scraped city ("chess club in X",
  "chess cafe in X"), kept only when the venue name mentions chess; lands in
  the admin review queue at 0.75 confidence.
- **Enrichment** (nightly, budget-capped): exact coordinates, rating and
  review count, one photo (stored in Supabase, fetched once), opening hours
  (drives the map's Open now filter), phone, canonical Google Maps link.
- **Submission verification**: each user submission is matched against
  Places; a match confirms the venue, pins coordinates, and fills the
  address.

All Google calls go through monthly caps in the api_usage table sized to
stay inside the free per-SKU allowances, so the steady-state cost is zero.
- Public tournament calendars (chess-results.com organizer venues) to catch
  tournament_venue entries.
