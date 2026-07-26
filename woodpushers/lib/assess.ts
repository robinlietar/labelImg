import { anthropic, MODELS, parseJsonLoose, textOf } from "@/lib/anthropic";

export type SubmissionPayload = {
  name: string;
  kind: string;
  address?: string | null;
  website?: string | null;
  when_notes?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type NearbyPlace = {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  distance_m: number;
};

export type Assessment = {
  plausible_real_place: boolean;
  chess_relevant: boolean;
  likely_duplicate_of: string | null; // place id or null
  quality_score: number; // 0..1
  issues: string[];
  suggested_copy: string | null;
};

/**
 * Cheap pre-assessment of a user submission with the small model. Given the
 * payload and the nearest existing places, returns a structured verdict.
 */
export async function assessSubmission(
  payload: SubmissionPayload,
  nearest: NearbyPlace[],
): Promise<Assessment | null> {
  const system = [
    "You assess user submissions for a directory of places to play",
    "over-the-board chess. Judge whether the place is plausibly real and",
    "actually relevant to playing OTB chess, and whether it duplicates one of",
    "the nearby existing places provided.",
    "",
    "Return ONLY JSON, no prose:",
    `{ "plausible_real_place": boolean, "chess_relevant": boolean,`,
    ` "likely_duplicate_of": string|null (the id of a nearby place, or null),`,
    ` "quality_score": number 0..1, "issues": string[],`,
    ` "suggested_copy": string|null (a one-line cleaned-up description) }`,
  ].join("\n");

  const user = JSON.stringify({ submission: payload, nearby_existing: nearest });

  try {
    const message = await anthropic().messages.create({
      model: MODELS.assessment,
      max_tokens: 700,
      system,
      messages: [{ role: "user", content: user }],
    });
    const parsed = parseJsonLoose<Assessment>(textOf(message));
    if (!parsed) return null;
    return {
      plausible_real_place: !!parsed.plausible_real_place,
      chess_relevant: !!parsed.chess_relevant,
      likely_duplicate_of: parsed.likely_duplicate_of ?? null,
      quality_score:
        typeof parsed.quality_score === "number"
          ? Math.max(0, Math.min(1, parsed.quality_score))
          : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      suggested_copy: parsed.suggested_copy ?? null,
    };
  } catch {
    return null;
  }
}
