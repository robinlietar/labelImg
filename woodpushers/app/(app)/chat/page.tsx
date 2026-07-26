import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chats" };

type Conversation = {
  conversation_id: string;
  other_handle: string;
  other_display_name: string;
  last_body: string | null;
  last_at: string | null;
  unread: number;
};

export default async function ChatListPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.rpc("my_conversations");
  const conversations = (data ?? []) as Conversation[];

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      <h1 className="text-xl font-semibold">Chats</h1>

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
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary">
                  ♟
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{c.other_display_name}</p>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
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
