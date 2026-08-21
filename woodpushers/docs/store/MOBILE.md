# Shipping ChessNow to the App Store and Google Play

The repo now contains complete native projects (Capacitor 7):
- `android/` full Android Studio project, icons and splashes generated
- `ios/` full Xcode project, icons and splashes generated
- `capacitor.config.ts` points both apps at the deployed web app, so
  every web deploy updates mobile instantly, no store re-review needed

Everything is prepared. What remains needs YOUR accounts (payment and
identity checks make this impossible to delegate):

## 0. One-time accounts (about 30 minutes + review delays)

- Google Play Console: https://play.google.com/console, 25 USD once.
- Apple Developer Program: https://developer.apple.com/programs/enroll,
  99 USD per year. Enroll as an individual with your Apple ID.

## 1. Android (simplest, do it first)

No Mac needed. Two options:

**Option A, recommended: cloud build with Codemagic** (free tier is enough)
1. Sign up at https://codemagic.io with your GitHub account, add the
   woodpushers repo.
2. New app > select repo > Capacitor Android. Build the `android/`
   project; Codemagic generates and stores the signing keystore for you.
3. Download the .aab from the build page.
4. In Play Console: create app "ChessNow", paste everything from
   LISTING.md (short and full description, category Social), upload
   docs/store/feature-graphic.png, the screenshots in the listed order,
   and the .aab under Production > Create release.
5. Fill the Data safety form with the answers in LISTING.md, run the
   content rating questionnaire, submit for review. First review takes
   a few days.

**Option B: any computer with Android Studio**: open `android/`, then
Build > Generate Signed Bundle. Keep the keystore file safe forever.

## 2. iOS (needs a Mac somewhere, Codemagic provides one)

1. In App Store Connect (https://appstoreconnect.apple.com): Apps > plus >
   New App. Platform iOS, name ChessNow, bundle ID app.chessnow
   (register it at developer.apple.com > Identifiers first), SKU
   chessnow-1.
2. In Codemagic: same repo, Capacitor iOS build. Connect your App Store
   Connect account (App Manager key): Codemagic handles certificates and
   provisioning automatically and can upload the build straight to
   TestFlight.
3. In App Store Connect: fill the listing from LISTING.md (subtitle,
   keywords, description, screenshots, privacy labels, review notes),
   select the uploaded build, submit for review.

## 3. After approval

- Each web deploy on Vercel IS the new app: native updates are only
  needed when changing icons, splash, plugins, or the domain.
- If you rename the Vercel domain, update `server.url` in
  capacitor.config.ts and rebuild both apps once.

## Regenerating assets later

- Icons and splashes: edit assets/icon.png and assets/splash*.png then
  run `npx capacitor-assets generate`.
- Store screenshots: docs/store/screenshots/, 1290x2796. Replace
  01-map.png with a real capture from your phone for a livelier map.

## Known review watchpoints (already handled)

- Privacy policy live at /legal/privacy, terms at /legal/terms.
- Report and block exist for user content (Apple guideline 1.2).
- Sign in with Google on iOS: Apple requires an equivalent alternative,
  and magic-link email sign in already satisfies that.
- Account deletion (Apple 5.1.1(v)): v1 accepts email requests via the
  support address; add in-app deletion soon after launch.
