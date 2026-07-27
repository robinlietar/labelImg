/** Map tab skeleton: instant feedback while the server renders. */
export default function MapLoading() {
  return (
    <div className="relative h-dvh w-full bg-secondary/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="h-11 animate-pulse rounded-full border border-border bg-card/95" />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 animate-pulse rounded-full border border-border bg-card/95" />
          ))}
        </div>
      </div>
    </div>
  );
}
