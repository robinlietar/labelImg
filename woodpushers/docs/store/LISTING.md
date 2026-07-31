# ChessMates: store listings, ready to paste

Everything below is copy-paste ready for App Store Connect and Google Play
Console. Character limits are respected. No em dashes anywhere.

## Identity

- App name (both stores): **ChessMates**
- Bundle id / package name: **app.chessmates** (already set in the native projects)
- Category: **Social Networking** (iOS primary), **Social** (Android).
  Secondary iOS: Sports.
- Price: Free. No in-app purchases (simplest review path).
- Privacy policy URL (required by both): https://woodpushers.vercel.app/legal/privacy
- Support URL: https://woodpushers.vercel.app
- Support email: robinlietar@gmail.com

## iOS subtitle (max 30 chars)

`Real chess, near you`

## iOS keywords (max 100 chars, comma separated, no spaces needed)

`chess,otb,chess club,chess near me,blitz,board games,meetup,chess cafe,play chess,echecs`

## Android short description (max 80 chars)

`Find places to play real chess, players near you, and the city chess calendar.`

## Full description (both stores)

ChessMates is the map of over-the-board chess. Wherever you are, find a
real board and a real opponent.

PLACES
Every pin is a real venue: chess clubs, chess cafes, bars with weekly
chess nights, park tables, libraries. Ratings, opening hours, photos and
directions included, with an Open now filter for spontaneous games.

PLAYERS
See who plays near you, at your level, without sharing your exact
location. Propose a game, chat to set it up, and follow your mates so
you can find them again. Link your Lichess or chess.com account to show
your real rating.

CALENDAR
Each city page lists the weekly casual nights and upcoming tournaments,
so you always know where chess is happening tonight.

COMMUNITY
Join your city's chess community chat, heart your favorite venues, and
put missing spots on the map for everyone.

ChessMates is built by chess players who kept asking the same question
in every new city: where does everyone play? Now the answer is one tap
away.

## Screenshot upload order (files in docs/store/screenshots/)

1. 02-players.png (See who wants a game)
2. 03-chat.png (Propose a game tonight)
3. 01-map.png (Every place to play, on one map)
4. 04-me.png (Your chess identity)

All are 1290x2796: valid for iOS 6.9"/6.7" and Google Play phones.
Tip: replace 01-map.png with a real capture from your phone (the live
map with pins and basemap looks much better than the offline render).
Play Store also wants the feature graphic: docs/store/feature-graphic.png
(1024x500). App icon 1024: assets/icon.png.

## Age rating questionnaires

Both stores: answer No to violence, gambling, sexual content, drugs,
horror. User-generated content: YES (chat, submitted places), with
moderation in place (report and block built in, admin review). Result
should be 4+ (iOS) / Everyone or Teen (Android, depending on the UGC
answer). Users can communicate: yes, private messages.

## Apple privacy nutrition labels (App Privacy section)

Data collected, linked to identity:
- Contact info: email (account creation)
- User content: messages (chat), photos (avatar), other (bio, submissions)
- Identifiers: user ID
- Coarse location: yes (city-level only, for finding nearby players).
  Precise location: NO (the app coarsens coordinates before storage).
Data not sold, not used for tracking, no third-party advertising.

## Google Play data safety

- Location: approximate only, optional, for app functionality.
- Personal info: email, name (display name), user IDs.
- Messages: in-app messages, for app functionality.
- Photos: profile photo, optional.
- All encrypted in transit. Account deletion available (contact email
  for v1; in-app deletion recommended before wide launch).

## Review notes (paste in App Review notes field)

ChessMates connects over-the-board chess players. Test account: create
one with any email (magic link) or use Google sign in. Location is
optional and only ever stored at city level. User content is moderated:
users can report and block, admins review submissions before they
appear on the map (or after auto-approval with high confidence).
