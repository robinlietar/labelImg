/** Shared profile vocab used by onboarding, the profile editor, and filters. */

export const TIME_CONTROLS = [
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
] as const;

export const AVAILABILITY_CHIPS = [
  { value: "weekday_mornings", label: "Weekday mornings" },
  { value: "weekday_evenings", label: "Weekday evenings" },
  { value: "weekends", label: "Weekends" },
  { value: "flexible", label: "Flexible" },
] as const;

/** Self-declared rating bands for players who do not link an account. */
export const RATING_BANDS = [
  { value: "under_1000", label: "New / under 1000" },
  { value: "1000_1400", label: "1000 to 1400" },
  { value: "1400_1800", label: "1400 to 1800" },
  { value: "1800_2200", label: "1800 to 2200" },
  { value: "over_2200", label: "2200+" },
] as const;

export type TimeControl = (typeof TIME_CONTROLS)[number]["value"];

/** Best known numeric rating across linked accounts, for badges and sorting. */
export function bestRating(
  lichess: Record<string, number> | null,
  chesscom: Record<string, number> | null,
): number | null {
  const vals = [
    lichess?.rapid,
    lichess?.blitz,
    lichess?.classical,
    chesscom?.rapid,
    chesscom?.blitz,
  ].filter((v): v is number => typeof v === "number");
  return vals.length ? Math.max(...vals) : null;
}
