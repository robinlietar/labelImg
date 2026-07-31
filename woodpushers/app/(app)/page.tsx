import { getProfile } from "@/lib/auth";
import { MapView } from "@/components/map/MapView";
import { TipsSheet } from "@/components/TipsSheet";

// Fallback when we know nothing about the viewer.
const DEFAULT_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

/**
 * Map home. Renders immediately; centering priority is handled client-side:
 * last saved viewport > home city (fetched async via homeCityId) > default.
 */
export default async function MapPage() {
  const profile = await getProfile();
  return (
    <div className="relative">
      <MapView
        initial={DEFAULT_VIEW}
        homeCityId={profile?.home_city_id ?? undefined}
      />
      <TipsSheet />
    </div>
  );
}
