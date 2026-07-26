import { MapView } from "@/components/map/MapView";

// Default view centered on Sydney, a launch city. Locate-me and city search
// move the viewport from here.
const SYDNEY = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

export default function MapPage() {
  return <MapView initial={SYDNEY} />;
}
