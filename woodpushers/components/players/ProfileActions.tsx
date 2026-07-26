"use client";

import { useState, useTransition } from "react";
import { proposeGame, blockUser, reportUser } from "@/app/(app)/p/actions";
import { Button } from "@/components/ui/button";
import { Flag, Ban, MoreHorizontal } from "lucide-react";

export function ProfileActions({ handle }: { handle: string }) {
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          size="lg"
          disabled={pending}
          onClick={() => start(() => proposeGame(handle))}
        >
          Propose a game
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="More"
          onClick={() => setMenu((m) => !m)}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {menu && (
        <div className="absolute right-0 top-14 z-20 w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <button
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary"
            onClick={() => {
              setMenu(false);
              start(async () => {
                await blockUser(handle);
                setNote("Blocked. They can no longer message you.");
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
                start(async () => {
                  await reportUser(handle, reason);
                  setNote("Reported. Thank you.");
                });
            }}
          >
            <Flag className="h-4 w-4" /> Report
          </button>
        </div>
      )}

      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
