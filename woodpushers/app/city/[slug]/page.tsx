import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MiniMap } from "@/components/map/MiniMap";
import { CityChatRequest } from "@/components/city/CityChatRequest";
import type { PlacePoint } from "@/lib/places";
import { KIND_LABEL } from "@/lib/places";
import { MessageCircle } from "lucide-react";

type CityDetail = {
  id: number;
  name: string;
  country_code: string;
  slug: string;
  lng: number;
  lat: number;
  whatsapp_invite_url: string | null;
};

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: cityRows } = await supabase.rpc("city_detail", { p_slug: slug });
  const city = (cityRows?.[0] ?? null) as CityDetail | null;
  if (!city) notFound();

  const [{ data: placeData }, { data: activeCount }] = await Promise.all([
    supabase.rpc("places_for_city", { city_slug: slug }),
    supabase.rpc("city_active_players", { city_slug: slug }),
  ]);
  const places = (placeData ?? []) as PlacePoint[];
  const active = (activeCount as number | null) ?? 0;

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
      <h1 className="text-2xl font-semibold">Chess in {city.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {places.length} {places.length === 1 ? "place" : "places"} to play ·{" "}
        {active} active {active === 1 ? "player" : "players"}
      </p>

      <div className="mt-4">
        <MiniMap
          center={{ lng: city.lng, lat: city.lat }}
          markers={places.map((p) => ({ id: p.id, lng: p.lng, lat: p.lat }))}
          zoom={11}
          height={260}
        />
      </div>

      <div className="mt-5">
        {city.whatsapp_invite_url ? (
          <a href={city.whatsapp_invite_url} target="_blank" rel="noopener noreferrer">
            <span className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground">
              <MessageCircle className="h-4 w-4" /> Join the {city.name} chat
            </span>
          </a>
        ) : (
          <CityChatRequest cityId={city.id} />
        )}
      </div>

      <ul className="mt-6 flex flex-col divide-y divide-border">
        {places.map((p) => (
          <li key={p.id}>
            <Link href={`/place/${p.id}`} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{KIND_LABEL[p.kind]}</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
