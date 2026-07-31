import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { searchPlacesEx } from "@/lib/google-places";

export const dynamic = "force-dynamic";

/** Worldwide Google autocomplete for the admin add-place form. */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ results: [] });

  const svc = createServiceClient();
  const { places, error } = await searchPlacesEx(svc, q, undefined, 6);
  if (error && error !== "budget") {
    return NextResponse.json({ error }, { status: 502 });
  }
  return NextResponse.json({
    results: places
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? null,
      })),
    budget: error === "budget",
  });
}
