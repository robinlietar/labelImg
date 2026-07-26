import type { PlaceKind } from "@/lib/places";

/** A place found by a source, before geocoding, dedupe, and insert. */
export type Candidate = {
  name: string;
  kind: PlaceKind;
  description?: string | null;
  address?: string | null;
  website?: string | null;
  opening_notes?: string | null;
  lat?: number | null;
  lng?: number | null;
  source: "osm" | "claude_research";
  source_url?: string | null;
  confidence: number; // 0..1
};

export type CityRow = {
  id: number;
  name: string;
  country_code: string;
  slug: string;
  population: number | null;
  lng: number;
  lat: number;
};

export type CityRunSummary = {
  city_id: number;
  slug: string;
  osm_found: number;
  claude_found: number;
  inserted: number;
  skipped_dupes: number;
  error?: string;
};
