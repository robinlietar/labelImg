import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { relTime } from "@/lib/time";

export const metadata = { title: "Chats" };
// Unread pills must reflect reads instantly, never a cached render.
export const dynamic = "force-dynamic";

type Conversation = {
  conversation_id: string;
  other_handle: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
};

export default async function ChatListPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data }, profile] = await Promise.all([
    supabase.rpc("my_conversations"),
    getProfile(),
  ]);
  const conversations = (data ?? []) as Conversation[];

  // Pinned community chat for the home city, when one exists.
  let cityChat: { cityName: string; slug: string; url: string } | null = null;
  if (profile?.home_city) {
    const { data: chat } = await supabase
      .from("city_chats")
      .select("whatsapp_invite_url")
      .eq("city_id", profile.home_city.id)
      .maybeSingle();
    if (chat?.whatsapp_invite_url) {
      cityChat = {
        cityName: profile.home_city.name,
        slug: profile.home_city.slug,
        url: chat.whatsapp_invite_url,
      };
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <h1 className="text-xl font-semibold">Chats</h1>

      {cityChat && (
        <a
          href={cityChat.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-accent/50 p-3"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg text-primary-foreground">
            ♞
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {cityChat.cityName} community chat
            </span>
            <span className="block text-sm text-muted-foreground">
              Join the WhatsApp group
            </span>
          </span>
          <span className="text-muted-foreground">→</span>
        </a>
      )}

      {conversations.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No chats yet. Find someone in Players and propose a game.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {conversations.map((c) => (
            <li key={c.conversation_id}>
              <Link
                href={`/chat/${c.conversation_id}`}
                className="flex items-center gap-3 py-3"
              >
                <Avatar url={c.other_avatar_url} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{c.other_display_name}</p>
                    <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{relTime(c.last_at)}</span>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.last_body ?? "New conversation"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
