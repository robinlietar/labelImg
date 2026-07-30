"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PlaceKind, PlacePoint } from "@/lib/places";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { KindFilter } from "@/components/map/KindFilter";
import { CitySearchBox } from "@/components/map/CitySearchBox";
import { ClusterBubble, PlacePin } from "@/components/map/pins";
import { useColorScheme } from "@/lib/use-color-scheme";
import { LocateFixed, Plus } from "lucide-react";

// OpenFreeMap styles (no key). Liberty is the rich light look; dark for night.
// If the dark style ever fails to load, we fall back to liberty.
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

type LeafProps = { place: PlacePoint };
type Feature =
  | Supercluster.PointFeature<LeafProps>
  | Supercluster.ClusterFeature<Record<string, never>>;

type ViewState = { longitude: number; latitude: number; zoom: number };

const VIEW_KEY = "wp:map-view";

function restoredView(fallback: ViewState): ViewState {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as ViewState;
    if (
      typeof v.longitude === "number" &&
      typeof v.latitude === "number" &&
      typeof v.zoom === "number"
    )
      return v;
  } catch {
    /* corrupted storage: ignore */
  }
  return fallback;
}

export function MapView({
  initial,
  homeCityId,
}: {
  initial: ViewState;
  homeCityId?: number;
}) {
  // Where you left the map wins over the server's guess (home city).
  const [initialView] = useState(() => restoredView(initial));
  const mapRef = useRef<MapRef>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [places, setPlaces] = useState<PlacePoint[]>([]);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState(initialView.zoom);
  const [selected, setSelected] = useState<PlacePoint | null>(null);
  const [kinds, setKinds] = useState<PlaceKind[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const scheme = useColorScheme();
  const [darkStyleBroken, setDarkStyleBroken] = useState(false);
  const styleUrl =
    scheme === "dark" && !darkStyleBroken ? STYLE_DARK : STYLE_LIGHT;

  const fetchPlaces = useCallback(
    async (b: [number, number, number, number], activeKinds: PlaceKind[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const params = new URLSearchParams({
        west: String(b[0]),
        south: String(b[1]),
        east: String(b[2]),
        north: String(b[3]),
      });
      if (activeKinds.length) params.set("kinds", activeKinds.join(","));
      try {
        const res = await fetch(`/api/places?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) return; // keep previous pins on server hiccups
        const json = (await res.json()) as { places?: PlacePoint[] };
        setPlaces(json.places ?? []);
      } catch {
        // aborted or offline: keep previous pins
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    const bbox: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
    setBounds(bbox);
    setZoom(map.getZoom());
    // Remember the viewport so the map reopens where you left it.
    try {
      const c = map.getCenter();
      localStorage.setItem(
        VIEW_KEY,
        JSON.stringify({ longitude: c.lng, latitude: c.lat, zoom: map.getZoom() }),
      );
    } catch {
      /* storage unavailable: fine */
    }
    void fetchPlaces(bbox, kinds);
  }, [fetchPlaces, kinds]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // First visit with a home city but no saved viewport: center there without
  // ever having blocked the initial render on it.
  useEffect(() => {
    if (!homeCityId) return;
    try {
      if (localStorage.getItem(VIEW_KEY)) return;
    } catch {
      return;
    }
    fetch(`/api/cities/center?id=${homeCityId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const c = j?.center as { lng: number; lat: number } | null;
        if (c) mapRef.current?.jumpTo({ center: [c.lng, c.lat], zoom: 11 });
      })
      .catch(() => {});
  }, [homeCityId]);

  // If the basemap style fails or is slow (flaky mobile network), the map's
  // load event never fires. Fetch pins from the initial viewport anyway:
  // markers are DOM overlays and render fine over a plain background.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!bounds) refresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [bounds, refresh]);

  // The open-now filter is client-side: hours ship with the pins.
  const visiblePlaces = useMemo(
    () => (openNow ? places.filter((p) => p.open_now === true) : places),
    [places, openNow],
  );

  const index = useMemo(() => {
    const sc = new Supercluster<LeafProps, Record<string, never>>({
      radius: 64,
      maxZoom: 16,
    });
    sc.load(
      visiblePlaces.map((p) => ({
        type: "Feature" as const,
        properties: { place: p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [visiblePlaces]);

  const clusters = useMemo<Feature[]>(() => {
    if (!bounds) return [];
    return index.getClusters(bounds, Math.round(zoom));
  }, [index, bounds, zoom]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      mapRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 13,
      });
    });
  }, []);

  const onChangeKinds = useCallback(
    (next: PlaceKind[]) => {
      setKinds(next);
      if (bounds) void fetchPlaces(bounds, next);
    },
    [bounds, fetchPlaces],
  );

  return (
    <div className="relative h-dvh w-full bg-secondary">
      <Map
        ref={mapRef}
        mapStyle={styleUrl}
        initialViewState={initialView}
        onLoad={refresh}
        onMoveEnd={refresh}
        onError={(e) => {
          // Dark style unavailable (offline dev, CDN change): drop to liberty.
          if (styleUrl === STYLE_DARK && /style|source|fetch/i.test(String(e?.error))) {
            setDarkStyleBroken(true);
          }
        }}
        attributionControl={{ compact: true }}
        dragRotate={false}
        reuseMaps
      >
        {clusters.map((c) => {
          const [lng, lat] = c.geometry.coordinates;
          const props = c.properties;
          if ("cluster" in props && props.cluster) {
            return (
              <Marker
                key={`c-${props.cluster_id}`}
                longitude={lng}
                latitude={lat}
              >
                <button
                  aria-label={`${props.point_count} places, tap to zoom`}
                  onClick={() => {
                    const z = Math.min(
                      index.getClusterExpansionZoom(props.cluster_id),
                      16,
                    );
                    mapRef.current?.flyTo({ center: [lng, lat], zoom: z });
                  }}
                >
                  <ClusterBubble count={props.point_count} />
                </button>
              </Marker>
            );
          }
          const place = props.place;
          return (
            <Marker key={place.id} longitude={lng} latitude={lat} anchor="bottom">
              <button
                aria-label={place.name}
                onClick={() => setSelected(place)}
                className="-m-1 p-1"
              >
                <PlacePin
                  kind={place.kind}
                  label={place.name}
                  selected={selected?.id === place.id}
                />
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Top overlay: search + kind filter, clear of the notch. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="pointer-events-auto">
          <CitySearchBox
            onPick={(c) =>
              mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 12 })
            }
          />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <KindFilter value={kinds} onChange={onChangeKinds} />
        </div>
        <div className="pointer-events-auto">
          <button
            onClick={() => setOpenNow((v) => !v)}
            aria-pressed={openNow}
            className={
              openNow
                ? "flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm"
                : "flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
            }
          >
            <span
              className={
                openNow
                  ? "h-2 w-2 rounded-full bg-primary-foreground"
                  : "h-2 w-2 rounded-full bg-emerald-500"
              }
            />
            Open now
          </button>
        </div>
      </div>

      {/* FABs, hidden while the sheet is open so they never overlap it. */}
      {!selected && (
        <>
          <Link
            href="/submit"
            aria-label="Add a place"
            className="absolute bottom-40 right-3 z-10 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </Link>
          <button
            onClick={locateMe}
            aria-label="Locate me"
            className="absolute bottom-24 right-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg"
          >
            <LocateFixed className="h-5 w-5" />
          </button>
        </>
      )}

      <PlaceSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
