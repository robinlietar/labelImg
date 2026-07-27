/** Skeleton for a public profile. */
export default function ProfileLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-secondary" />
        <div>
          <div className="h-5 w-36 animate-pulse rounded bg-secondary" />
          <div className="mt-1.5 h-3.5 w-24 animate-pulse rounded bg-secondary/70" />
        </div>
      </div>
      <div className="mt-5 h-24 animate-pulse rounded-xl border border-border bg-secondary/40" />
      <div className="mt-6 h-12 animate-pulse rounded-lg bg-secondary" />
    </main>
  );
}
