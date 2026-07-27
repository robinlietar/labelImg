"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { clockTime, dayLabel } from "@/lib/time";
import { blockUser, reportUser } from "@/app/(app)/p/actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ban, Flag, MoreHorizontal, Send } from "lucide-react";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function ChatThread({
  conversationId,
  meId,
  otherName,
  otherHandle,
  otherAvatarUrl,
  initialMessages,
  draft,
}: {
  conversationId: string;
  meId: string;
  otherName: string;
  otherHandle: string | null;
  otherAvatarUrl?: string | null;
  initialMessages: ChatMessage[];
  draft: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState(draft);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [, startAction] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const sb = supabase.current;
    void sb
      .rpc("mark_read", { p_conversation_id: conversationId })
      .then(() => window.dispatchEvent(new Event("wp:unread-refresh")));

    const channel = sb
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
          if (m.sender_id !== meId)
            void sb.rpc("mark_read", { p_conversation_id: conversationId }).then(() => {
      window.dispatchEvent(new Event("wp:unread-refresh"));
    });
        },
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [conversationId, meId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.current
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, body })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      // A WITH CHECK failure here is almost always a block in either direction.
      setError(
        /policy|check/i.test(error.message)
          ? "Message not delivered. One of you has blocked the other."
          : "Message could not be sent, try again.",
      );
      return;
    }
    setText("");
    if (data)
      setMessages((prev) =>
        prev.some((x) => x.id === data.id) ? prev : [...prev, data as ChatMessage],
      );
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="relative flex items-center gap-3 border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <Link href="/chat" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {otherHandle ? (
          <Link href={`/p/${otherHandle}`} className="flex flex-1 items-center gap-2 font-medium">
            <Avatar url={otherAvatarUrl} size={32} /> {otherName}
          </Link>
        ) : (
          <span className="flex flex-1 items-center gap-2 font-medium">
            <Avatar url={otherAvatarUrl} size={32} /> {otherName}
          </span>
        )}
        {otherHandle && (
          <button
            aria-label="Conversation options"
            onClick={() => setMenu((m) => !m)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
        {menu && otherHandle && (
          <div className="absolute right-3 top-12 z-30 w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
              onClick={() => {
                setMenu(false);
                startAction(async () => {
                  await blockUser(otherHandle);
                  setError("Blocked. They can no longer message you.");
                });
              }}
            >
              <Ban className="h-4 w-4" /> Block
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
              onClick={() => {
                setMenu(false);
                const reason = window.prompt("What is the problem?") ?? "";
                if (reason)
                  startAction(async () => {
                    await reportUser(otherHandle, reason);
                    setError("Reported. Thank you.");
                  });
              }}
            >
              <Flag className="h-4 w-4" /> Report
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const newDay =
            !prev ||
            new Date(prev.created_at).toDateString() !==
              new Date(m.created_at).toDateString();
          // Show the time under the last message of a same-sender run.
          const endOfRun =
            !next ||
            next.sender_id !== m.sender_id ||
            new Date(next.created_at).getTime() -
              new Date(m.created_at).getTime() >
              5 * 60 * 1000;
          return (
            <div key={m.id}>
              {newDay && (
                <p className="my-3 text-center text-[11px] font-medium text-muted-foreground">
                  {dayLabel(m.created_at)}
                </p>
              )}
              <div className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[80%]">
                  <div
                    className={
                      mine
                        ? "rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "rounded-2xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"
                    }
                  >
                    {m.body}
                  </div>
                  {endOfRun && (
                    <p
                      className={
                        "mt-0.5 text-[10px] text-muted-foreground " +
                        (mine ? "text-right" : "text-left")
                      }
                    >
                      {clockTime(m.created_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="px-4 pb-1 text-center text-xs text-destructive">{error}</p>
      )}

      <form
        onSubmit={send}
        className="flex items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Propose a game..."
          rows={1}
          maxLength={2000}
          className="max-h-32 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
