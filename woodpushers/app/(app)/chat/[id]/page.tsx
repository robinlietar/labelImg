import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatThread, type ChatMessage } from "@/components/chat/ChatThread";

export const metadata = { title: "Chat" };

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const { draft } = await searchParams;

  const supabase = await createClient();

  // One parallel round trip: membership (with the other player's profile
  // embedded) and the messages. RLS returns zero rows for non-members.
  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase
      .from("conversation_members")
      .select("profile_id, profiles(handle, display_name, avatar_url)")
      .eq("conversation_id", id),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  if (!members || !members.some((m) => m.profile_id === user.id)) notFound();

  const otherRow = members.find((m) => m.profile_id !== user.id);
  const otherProfile = otherRow
    ? ((Array.isArray(otherRow.profiles)
        ? otherRow.profiles[0]
        : otherRow.profiles) as {
        handle: string;
        display_name: string;
        avatar_url: string | null;
      } | null)
    : null;
  const other = otherProfile;

  return (
    <ChatThread
      conversationId={id}
      meId={user.id}
      otherName={other?.display_name ?? "Player"}
      otherHandle={other?.handle ?? null}
      otherAvatarUrl={other?.avatar_url ?? null}
      initialMessages={(messages ?? []) as ChatMessage[]}
      draft={draft ?? ""}
    />
  );
}
