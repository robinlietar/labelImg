import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic client and current model ids.
 *
 * Model ids are pinned here from the build spec. Before shipping, confirm they
 * are still current against https://docs.claude.com/en/docs/intro and update
 * this one place. City research uses the server-side web search tool; cheap
 * submission assessment uses the small model.
 */
export const MODELS = {
  cityResearch: "claude-sonnet-4-6",
  assessment: "claude-haiku-4-5-20251001",
} as const;

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** Extract concatenated text from a messages response. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Parse a JSON payload out of a model response that may wrap it in prose or a
 * ```json fence. Returns null on failure so callers can degrade gracefully.
 */
export function parseJsonLoose<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  // Try progressively shorter suffixes from the last closing bracket.
  const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
