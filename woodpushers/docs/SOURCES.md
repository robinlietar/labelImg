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
chess.com club pages that publish a physical venue, and city subreddits.

## Candidates for later

- **Google Places** enrichment (pending an API key): phone, hours, photos,
  ratings, canonical map links, plus refresh-based address validation.
- Wikidata/Wikipedia lists of chess clubs (historic clubs, notable venues).
- Public tournament calendars (chess-results.com organizer venues) to catch
  tournament_venue entries.
