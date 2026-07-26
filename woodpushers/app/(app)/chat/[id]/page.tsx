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

  // Membership is enforced by RLS: a non-member reads zero rows.
  const { data: members } = await supabase
    .from("conversation_members")
    .select("profile_id")
    .eq("conversation_id", id);
  if (!members || !members.some((m) => m.profile_id === user.id)) notFound();

  const otherId = members.find((m) => m.profile_id !== user.id)?.profile_id;
  const { data: other } = otherId
    ? await supabase
        .from("profiles")
        .select("handle, display_name")
        .eq("id", otherId)
        .maybeSingle()
    : { data: null };

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <ChatThread
      conversationId={id}
      meId={user.id}
      otherName={other?.display_name ?? "Player"}
      otherHandle={other?.handle ?? null}
      initialMessages={(messages ?? []) as ChatMessage[]}
      draft={draft ?? ""}
    />
  );
}
