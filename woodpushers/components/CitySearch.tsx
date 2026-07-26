"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type City = {
  id: number;
  name: string;
  country_code: string;
  slug: string;
};

/**
 * City typeahead. Writes the chosen city id into a hidden input named by
 * `name`, so it submits with a plain form. Used in onboarding and filters.
 */
export function CitySearch({
  name,
  defaultCity,
  placeholder = "Search your city",
}: {
  name: string;
  defaultCity?: City;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(
    defaultCity ? `${defaultCity.name}, ${defaultCity.country_code}` : "",
  );
  const [results, setResults] = useState<City[]>([]);
  const [chosen, setChosen] = useState<City | null>(defaultCity ?? null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chosen) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cities/search?q=${encodeURIComponent(query)}`,
        );
        const json = await res.json();
        setResults(json.cities ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, chosen]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name={name} value={chosen?.id ?? ""} />
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setChosen(null);
        }}
        onFocus={() => results.length && setOpen(true)}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setChosen(c);
                  setQuery(`${c.name}, ${c.country_code}`);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                <span>{c.name}</span>
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
