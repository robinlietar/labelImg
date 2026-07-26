import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Total unread messages for the signed-in user, for the tab-bar badge. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ unread: 0 });
    const { data } = await supabase.rpc("unread_total");
    return NextResponse.json({ unread: (data as number | null) ?? 0 });
  } catch {
    return NextResponse.json({ unread: 0 });
  }
}
