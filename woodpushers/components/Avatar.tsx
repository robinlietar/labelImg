import { cn } from "@/lib/utils";

/** Player avatar with the pawn fallback. Sizes: px number. */
export function Avatar({
  url,
  size = 44,
  className,
}: {
  url: string | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: size * 0.45 }}>♟</span>
      )}
    </span>
  );
}
