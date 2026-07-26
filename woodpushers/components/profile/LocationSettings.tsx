"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setHomeCity, setLocationFromDevice } from "@/app/(app)/me/actions";
import { CitySearch } from "@/components/CitySearch";
import { Button } from "@/components/ui/button";
import { coarsen } from "@/lib/geo";
import { LocateFixed } from "lucide-react";

/**
 * Location can be set two ways, both coarsened so a precise position is never
 * stored: pick a home city, or use the device location.
 */
export function LocationSettings({ currentCity }: { currentCity: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);

  function useDevice() {
    if (!navigator.geolocation) {
      setNote("This device has no location support.");
      return;
    }
    setNote("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Coarsen on the client before it ever leaves the phone.
        const c = coarsen(pos.coords.longitude, pos.coords.latitude);
        start(async () => {
          await setLocationFromDevice(c.lng, c.lat);
          setNote("Location updated (rounded for privacy).");
          router.refresh();
        });
      },
      () => setNote("Could not get location. Check permissions."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold">Location</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Currently: {currentCity ?? "not set"}. Only a distance band is ever shown
        to others, never your position.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <Button variant="outline" onClick={useDevice} disabled={pending}>
          <LocateFixed className="h-4 w-4" /> Use my current location
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or set a city{" "}
          <span className="h-px flex-1 bg-border" />
        </div>

        <CitySearch
          placeholder="Change home city"
          onSelect={(c) => setCityId(c?.id ?? null)}
        />
        <Button
          disabled={pending || !cityId}
          onClick={() =>
            cityId &&
            start(async () => {
              await setHomeCity(cityId);
              setNote("Home city updated.");
              router.refresh();
            })
          }
        >
          Save home city
        </Button>
      </div>

      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
