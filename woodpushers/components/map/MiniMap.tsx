"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

/** Small non-clustered map for place and city pages. */
export function MiniMap({
  center,
  markers,
  zoom = 14,
  height = 220,
}: {
  center: { lng: number; lat: number };
  markers: Array<{ id: string; lng: number; lat: number }>;
  zoom?: number;
  height?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ height }}>
      <Map
        mapStyle={STYLE_URL}
        initialViewState={{ longitude: center.lng, latitude: center.lat, zoom }}
        attributionControl={{ compact: true }}
        dragRotate={false}
      >
        {markers.map((m) => (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat}>
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-primary text-xs text-primary-foreground shadow">
              ♟
            </span>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
