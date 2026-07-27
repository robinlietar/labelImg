/** Skeleton for the chat list. */
export default function ChatLoading() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="h-7 w-24 animate-pulse rounded bg-secondary" />
      <div className="mt-5 flex flex-col gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-full bg-secondary" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
              <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-secondary/70" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
