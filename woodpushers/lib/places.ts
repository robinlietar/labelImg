/** Place kinds shared by the map, filters, and submission form. */

export const PLACE_KINDS = [
  "club",
  "cafe",
  "bar",
  "park",
  "library",
  "community_center",
  "tournament_venue",
  "shop",
  "other",
] as const;

export type PlaceKind = (typeof PLACE_KINDS)[number];

export const KIND_LABEL: Record<PlaceKind, string> = {
  club: "Club",
  cafe: "Cafe",
  bar: "Bar",
  park: "Park",
  library: "Library",
  community_center: "Community center",
  tournament_venue: "Tournament venue",
  shop: "Shop",
  other: "Other",
};

/** Friendly names for where a place record came from. */
export const SOURCE_LABEL: Record<string, string> = {
  osm: "OpenStreetMap",
  claude_research: "Researched",
  user_submission: "Community",
  import: "Imported",
};

export type PlacePoint = {
  id: string;
  name: string;
  kind: PlaceKind;
  address: string | null;
  website: string | null;
  source: "osm" | "claude_research" | "user_submission" | "import";
  lng: number;
  lat: number;
};
