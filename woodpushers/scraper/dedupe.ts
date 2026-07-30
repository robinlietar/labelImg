import { domainOf, haversineMeters, nameSimilarity } from "@/lib/geo";
import type { Candidate } from "./types";

export type ExistingPlace = {
  id?: string;
  name: string;
  lng: number;
  lat: number;
  website: string | null;
};

const NAME_THRESHOLD = 0.6;
const DISTANCE_METERS = 150;

/**
 * A candidate is a duplicate of an existing place when their names are similar
 * and they sit within 150 m of each other, or when they share a web domain.
 */
export function isDuplicate(
  cand: Candidate,
  existing: ExistingPlace[],
): boolean {
  const candDomain = domainOf(cand.website);
  for (const e of existing) {
    if (candDomain && candDomain === domainOf(e.website)) return true;
    if (cand.lat != null && cand.lng != null) {
      const meters = haversineMeters(
        { lng: cand.lng, lat: cand.lat },
        { lng: e.lng, lat: e.lat },
      );
      if (
        meters <= DISTANCE_METERS &&
        nameSimilarity(cand.name, e.name) >= NAME_THRESHOLD
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Dedupe a batch of candidates against each other (in-run collisions). */
export function dedupeWithinBatch(cands: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of cands) {
    const dup = kept.some((k) => {
      if (
        domainOf(c.website) &&
        domainOf(c.website) === domainOf(k.website)
      )
        return true;
      if (
        c.lat != null &&
        c.lng != null &&
        k.lat != null &&
        k.lng != null &&
        haversineMeters(
          { lng: c.lng, lat: c.lat },
          { lng: k.lng, lat: k.lat },
        ) <= DISTANCE_METERS &&
        nameSimilarity(c.name, k.name) >= NAME_THRESHOLD
      )
        return true;
      return false;
    });
    if (!dup) kept.push(c);
  }
  return kept;
}
