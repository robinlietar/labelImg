import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MapView } from "@/components/map/MapView";

// Fallback when we know nothing about the viewer.
const DEFAULT_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

/**
 * Map home. Initial center priority: the viewer's last map position (client,
 * localStorage) > their home city > Sydney. The client may also refine via
 * geolocation with the locate button.
 */
export default async function MapPage() {
  let initial = DEFAULT_VIEW;
  try {
    const profile = await getProfile();
    if (profile?.home_city_id) {
      const supabase = await createClient();
      const { data: city } = await supabase
        .from("cities")
        .select("slug")
        .eq("id", profile.home_city_id)
        .maybeSingle();
      if (city?.slug) {
        const { data } = await supabase.rpc("city_detail", { p_slug: city.slug });
        const c = data?.[0] as { lng: number; lat: number } | undefined;
        if (c) initial = { longitude: c.lng, latitude: c.lat, zoom: 11 };
      }
    }
  } catch {
    // Not signed in or DB unreachable: keep the default.
  }
  return <MapView initial={initial} />;
}
