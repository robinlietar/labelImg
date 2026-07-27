/** Skeleton for the profile page. */
export default function MeLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-secondary" />
        <div>
          <div className="h-5 w-32 animate-pulse rounded bg-secondary" />
          <div className="mt-1.5 h-3.5 w-24 animate-pulse rounded bg-secondary/70" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-6 h-32 animate-pulse rounded-xl border border-border bg-secondary/40" />
      ))}
    </main>
  );
}
