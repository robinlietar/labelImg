import type { PlacePoint } from "@/lib/places";

/**
 * Demo places served by /api/places ONLY when Supabase is not configured
 * (local dev without env). Mirrors supabase/sample-data.sql so the map is
 * never an empty screen in development.
 */
export const FIXTURE_PLACES: PlacePoint[] = [
  { id: "fx-1", name: "Hyde Park Giant Chess", kind: "park", address: "Hyde Park, Sydney NSW", website: null, source: "import", lng: 151.211, lat: -33.8709 },
  { id: "fx-2", name: "St George Leagues Chess Club", kind: "club", address: "Kogarah, Sydney NSW", website: null, source: "import", lng: 151.133, lat: -33.966 },
  { id: "fx-3", name: "Sydney Chess Centre", kind: "club", address: "Sydney CBD NSW", website: null, source: "import", lng: 151.207, lat: -33.876 },
  { id: "fx-4", name: "Ryde-Eastwood Leagues Chess", kind: "club", address: "West Ryde, Sydney NSW", website: null, source: "import", lng: 151.09, lat: -33.807 },
  { id: "fx-5", name: "Chess Cafe Newtown", kind: "cafe", address: "King St, Newtown NSW", website: null, source: "import", lng: 151.179, lat: -33.898 },
  { id: "fx-6", name: "The Rook and Pawn", kind: "bar", address: "Surry Hills NSW", website: null, source: "import", lng: 151.212, lat: -33.886 },
  { id: "fx-7", name: "Jardin du Luxembourg", kind: "park", address: "75006 Paris", website: null, source: "import", lng: 2.3372, lat: 48.8462 },
  { id: "fx-8", name: "Cercle d'Echecs de Paris", kind: "club", address: "Paris 75011", website: null, source: "import", lng: 2.376, lat: 48.857 },
];

export function fixturesInBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  kinds: string[] | null,
): PlacePoint[] {
  return FIXTURE_PLACES.filter(
    (p) =>
      p.lng >= west &&
      p.lng <= east &&
      p.lat >= south &&
      p.lat <= north &&
      (!kinds || kinds.includes(p.kind)),
  );
}
