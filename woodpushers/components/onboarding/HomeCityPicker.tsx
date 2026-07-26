"use client";

import { useState } from "react";
import { CitySearch } from "@/components/CitySearch";
import { Button } from "@/components/ui/button";
import { coarsen } from "@/lib/geo";
import { LocateFixed } from "lucide-react";

type City = { id: number; name: string; country_code: string; slug: string };

/**
 * Home-city field: search by name, or one tap to use the device location and
 * snap to the closest known city. The position is coarsened on the phone
 * before it is ever sent.
 */
export function HomeCityPicker() {
  const [city, setCity] = useState<City | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function useLocation() {
    if (!navigator.geolocation) {
      setNote("No location support on this device.");
      return;
    }
    setBusy(true);
    setNote("Finding your city...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = coarsen(pos.coords.longitude, pos.coords.latitude);
        try {
          const res = await fetch(`/api/cities/nearest?lng=${c.lng}&lat=${c.lat}`);
          const json = (await res.json()) as { city: City | null };
          if (json.city) {
            setCity(json.city);
            setNote(null);
          } else {
            setNote("Could not match a city, search instead.");
          }
        } catch {
          setNote("Network problem, search instead.");
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setNote("Location unavailable. Check permissions, or search.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="home_city_id" value={city?.id ?? ""} />
      <CitySearch
        key={city?.id ?? "empty"}
        defaultCity={city ?? undefined}
        onSelect={(c) => setCity(c)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={useLocation}
        disabled={busy}
        className="self-start"
      >
        <LocateFixed className="h-4 w-4" /> Use my location
      </Button>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
