"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Interactive pin placement: drag the marker (or tap the map) to set the
 * exact spot, e.g. the actual chess tables inside a park.
 */
export function PinEditor({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div>
      <div className="h-64 overflow-hidden rounded-lg border border-border">
        <Map
          initialViewState={{ latitude: lat, longitude: lng, zoom: 16 }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          attributionControl={{ compact: true }}
          dragRotate={false}
          onClick={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
        >
          <Marker
            latitude={lat}
            longitude={lng}
            draggable
            anchor="bottom"
            onDragEnd={(e) => onChange(e.lngLat.lat, e.lngLat.lng)}
          >
            <div className="flex flex-col items-center">
              <div className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-primary text-sm text-primary-foreground shadow-md">
                ♟
              </div>
              <div className="-mt-0.5 h-2 w-0.5 bg-primary" />
            </div>
          </Marker>
        </Map>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Drag the pin or tap the map to set the exact spot, then save.
      </p>
    </div>
  );
}
