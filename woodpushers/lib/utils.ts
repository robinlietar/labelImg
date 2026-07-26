import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Accept only http(s) URLs; everything else (javascript:, data:, garbage)
 * becomes null. Use before storing or rendering any user-supplied link.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const candidate = raw.trim();
  try {
    const u = new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    );
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
