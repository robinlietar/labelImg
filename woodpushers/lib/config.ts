/**
 * Central product config. Rename the app here (name, tagline, domain) and it
 * propagates to the layout metadata, PWA manifest, and UI chrome. This is the
 * single place to change if we ever rename the app.
 */
export const APP = {
  name: "ChessMates",
  tagline: "Over-the-board chess, anywhere",
  // Launch cities: the owner runs real communities here.
  launchCities: ["sydney", "paris"] as const,
  description:
    "Find places to play over-the-board chess and players nearby, city by city.",
} as const;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
