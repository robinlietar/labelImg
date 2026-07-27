import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span aria-hidden className="text-5xl">♞</span>
      <div>
        <h1 className="text-2xl font-semibold">Off the board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page does not exist, or it was captured.
        </p>
      </div>
      <Link href="/">
        <Button>Back to the map</Button>
      </Link>
    </main>
  );
}
