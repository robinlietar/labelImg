import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ChessNow mobile shell: the native apps load the deployed web app, so
 * every web release ships to mobile instantly with no store re-review.
 * Update server.url if the production domain changes.
 */
const config: CapacitorConfig = {
  appId: "app.chessnow",
  appName: "ChessNow",
  webDir: "mobile/www",
  server: {
    url: "https://woodpushers.vercel.app",
    allowNavigation: ["*.supabase.co", "accounts.google.com", "lichess.org"],
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#181b20",
  },
  android: {
    backgroundColor: "#181b20",
  },
};

export default config;
