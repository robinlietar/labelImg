"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PlaceKind, PlacePoint } from "@/lib/places";
import { PlaceSheet } from "@/components/map/PlaceSheet";
import { KindFilter } from "@/components/map/KindFilter";
import Link from "next/link";
import { LocateFixed, Plus, Search } from "lucide-react";

// Calm light basemap from OpenFreeMap (no API key). Dark handled by a CSS
// filter fallback until a dedicated dark style is wired in Phase 5.
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

type LeafProps = { place: PlacePoint };
type Feature =
  | Supercluster.PointFeature<LeafProps>
  | Supercluster.ClusterFeature<Record<string, never>>;

export function MapView({
  initial,
}: {
  initial: { longitude: number; latitude: number; zoom: number };
}) {
  const mapRef = useRef<MapRef>(null);
  const [places, setPlaces] = useState<PlacePoint[]>([]);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState(initial.zoom);
  const [selected, setSelected] = useState<PlacePoint | null>(null);
  const [kinds, setKinds] = useState<PlaceKind[]>([]);

  const fetchPlaces = useCallback(
    async (b: [number, number, number, number], activeKinds: PlaceKind[]) => {
      const params = new URLSearchParams({
        west: String(b[0]),
        south: String(b[1]),
        east: String(b[2]),
        north: String(b[3]),
      });
      if (activeKinds.length) params.set("kinds", activeKinds.join(","));
      try {
        const res = await fetch(`/api/places?${params}`);
        const json = await res.json();
        setPlaces(json.places ?? []);
      } catch {
        setPlaces([]);
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
    void fetchPlaces(bbox, kinds);
  }, [fetchPlaces, kinds]);

  const index = useMemo(() => {
    const sc = new Supercluster<LeafProps, Record<string, never>>({
      radius: 60,
      maxZoom: 16,
    });
    sc.load(
      places.map((p) => ({
        type: "Feature" as const,
        properties: { place: p },
        geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
      })),
    );
    return sc;
  }, [places]);

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
    <div className="relative h-dvh w-full">
      <Map
        ref={mapRef}
        mapStyle={STYLE_URL}
        initialViewState={initial}
        onLoad={refresh}
        onMoveEnd={refresh}
        attributionControl={{ compact: true }}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />

        {clusters.map((c, i) => {
          const [lng, lat] = c.geometry.coordinates;
          const props = c.properties;
          if ("cluster" in props && props.cluster) {
            const size = 30 + Math.min(props.point_count, 40);
            return (
              <Marker key={`c-${props.cluster_id}`} longitude={lng} latitude={lat}>
                <button
                  aria-label={`${props.point_count} places`}
                  onClick={() => {
                    const z = Math.min(
                      index.getClusterExpansionZoom(props.cluster_id),
                      16,
                    );
                    mapRef.current?.flyTo({ center: [lng, lat], zoom: z });
                  }}
                  className="grid place-items-center rounded-full bg-primary font-medium text-primary-foreground shadow-md"
                  style={{ width: size, height: size }}
                >
                  {props.point_count}
                </button>
              </Marker>
            );
          }
          const place = props.place;
          return (
            <Marker key={`p-${place.id}-${i}`} longitude={lng} latitude={lat}>
              <button
                aria-label={place.name}
                onClick={() => setSelected(place)}
                className="grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-primary text-sm text-primary-foreground shadow"
              >
                ♟
              </button>
            </Marker>
          );
        })}
      </Map>

      {/* Top controls: search + kind filter */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-sm backdrop-blur">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search a city"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="pointer-events-auto">
          <KindFilter value={kinds} onChange={onChangeKinds} />
        </div>
      </div>

      {/* Locate me + add a place */}
      <button
        onClick={locateMe}
        aria-label="Locate me"
        className="absolute bottom-24 right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-md"
      >
        <LocateFixed className="h-5 w-5" />
      </button>
      <Link
        href="/submit"
        aria-label="Add a place"
        className="absolute bottom-40 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-md"
      >
        <Plus className="h-5 w-5" />
      </Link>

      <PlaceSheet place={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
