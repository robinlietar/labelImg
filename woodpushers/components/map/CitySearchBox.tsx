"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { CityHit } from "@/app/api/cities/search/route";

/**
 * The map's city search. Live typeahead over cities; picking one flies the
 * map there. Fully keyboard- and tap-friendly.
 */
export function CitySearchBox({
  onPick,
}: {
  onPick: (city: CityHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityHit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { cities: CityHit[] };
        if (seq !== seqRef.current) return; // stale response
        setResults(json.cities ?? []);
        setOpen((json.cities ?? []).length > 0);
      } catch {
        /* offline: keep quiet */
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
          autoCorrect="off"
        />
        {query && (
          <button
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  onPick(c);
                  setQuery(`${c.name}`);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-secondary"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.country_code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
