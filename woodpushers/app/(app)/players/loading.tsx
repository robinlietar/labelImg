/** Skeleton for the players directory while the RPC runs. */
export default function PlayersLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="h-7 w-40 animate-pulse rounded bg-secondary" />
      <div className="mt-3 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-secondary" />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-secondary/50" />
        ))}
      </div>
    </main>
  );
}
