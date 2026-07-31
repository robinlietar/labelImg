"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PLACE_KINDS, KIND_LABEL, type PlaceKind } from "@/lib/places";
import { MapPin, Plus, X } from "lucide-react";

type Suggestion = { id: string; name: string; address: string | null };

/**
 * Add any venue worldwide by name, autocompleted from Google Places.
 * Picked places arrive fully enriched (rating, hours, phone, exact pin).
 */
export function AddPlace() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [kind, setKind] = useState<string>("club");
  const [adding, setAdding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3 || picked) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/place-search?q=${encodeURIComponent(q.trim())}`);
        const json = (await res.json()) as { results?: Suggestion[]; budget?: boolean };
        setResults(json.results ?? []);
        if (json.budget) toast("Monthly Google search budget reached.", "error");
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, picked]);

  const add = async () => {
    if (!picked) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/add-place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googlePlaceId: picked.id, kind }),
      });
      const json = (await res.json()) as { ok?: boolean; name?: string; error?: string };
      if (!res.ok || !json.ok) {
        toast(json.error ?? "Could not add the place.", "error");
        return;
      }
      toast(`${json.name} added to the map, fully enriched.`, "success");
      setPicked(null);
      setQ("");
      router.refresh();
    } catch {
      toast("Could not add the place, try again.", "error");
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add a place
      </Button>
    );
  }

  return (
    <div className="max-w-xl rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Add a place from Google Maps</p>
        <button
          onClick={() => {
            setOpen(false);
            setPicked(null);
            setQ("");
          }}
          aria-label="Close"
          className="rounded p-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!picked ? (
        <div className="mt-2">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Try "chess club Tokyo" or "warung chess Bali"'
          />
          {searching && (
            <p className="mt-2 text-xs text-muted-foreground">Searching Google Maps...</p>
          )}
          {results.length > 0 && (
            <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setPicked(r)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block font-medium">{r.name}</span>
                      {r.address && (
                        <span className="block text-xs text-muted-foreground">
                          {r.address}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm font-medium">{picked.name}</p>
          {picked.address && (
            <p className="text-xs text-muted-foreground">{picked.address}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-40">
              {PLACE_KINDS.map((k: PlaceKind) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
            <Button size="sm" disabled={adding} onClick={add}>
              {adding ? "Adding..." : "Add to the map"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
