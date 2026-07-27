import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { APP } from "@/lib/config";

/** Shared chrome for legal pages so they are never a dead end. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md select-text">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <Link
          href="/"
          aria-label={`Back to ${APP.name}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {APP.name}
        </Link>
      </header>
      {children}
      <p className="px-5 pb-10 text-xs text-muted-foreground">
        Last updated July 2026.
      </p>
    </div>
  );
}
