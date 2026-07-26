import { APP } from "@/lib/config";

/**
 * Phase 0 hello-world. This becomes the full-screen map in Phase 1.
 * Kept as a plain server component so the later map swap is isolated to one file.
 */
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden
          className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-3xl text-primary-foreground"
        >
          ♞
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{APP.name}</h1>
        <p className="max-w-sm text-muted-foreground">{APP.tagline}.</p>
      </div>

      <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
        Phase 0 is live. The full-screen map, players, and city chats land in the
        next phases.
      </div>

      <p className="text-xs text-muted-foreground">
        Launch cities: {APP.launchCities.join(", ")}
      </p>
    </main>
  );
}
