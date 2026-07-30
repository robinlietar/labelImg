/**
 * Opening hours stored on places.opening_hours (from Google Places):
 * { weekday: string[], periods: [{open:{day,hour,minute}, close:{...}}],
 *   utc_offset_minutes: number }. Day 0 is Sunday, venue-local time.
 */
export type StoredHours = {
  weekday?: string[] | null;
  periods?: Array<{
    open?: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }> | null;
  utc_offset_minutes?: number | null;
};

const WEEK_MINUTES = 7 * 24 * 60;

/**
 * Whether the venue is open right now, or null when unknown (no structured
 * hours). A period without a close means always open (Google's 24/7 shape).
 */
export function isOpenNow(hours: StoredHours | null | undefined): boolean | null {
  if (!hours?.periods?.length) return null;
  const offset = hours.utc_offset_minutes;
  if (offset == null) return null;

  // Venue-local clock via its UTC offset; read with getUTC* to avoid the
  // server's own timezone leaking in.
  const local = new Date(Date.now() + offset * 60_000);
  const nowMin =
    local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();

  for (const p of hours.periods) {
    if (!p.open) continue;
    if (!p.close) return true; // open 24/7
    const start = p.open.day * 1440 + p.open.hour * 60 + p.open.minute;
    let end = p.close.day * 1440 + p.close.hour * 60 + p.close.minute;
    if (end <= start) end += WEEK_MINUTES; // crosses midnight or the week wrap
    if (
      (nowMin >= start && nowMin < end) ||
      (nowMin + WEEK_MINUTES >= start && nowMin + WEEK_MINUTES < end)
    ) {
      return true;
    }
  }
  return false;
}
