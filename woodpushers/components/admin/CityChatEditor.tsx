"use client";

import { useState, useTransition } from "react";
import { saveCityChat } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CityChatRow = {
  city_id: number;
  city_name: string;
  slug: string;
  whatsapp_invite_url: string | null;
  notes: string | null;
};

export function CityChatEditor({ row }: { row: CityChatRow }) {
  const [url, setUrl] = useState(row.whatsapp_invite_url ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-medium">
        {row.city_name}{" "}
        <span className="text-xs text-muted-foreground">/{row.slug}</span>
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <Input
          placeholder="WhatsApp invite URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
        />
        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveCityChat(row.city_id, url, notes);
              setSaved(true);
            })
          }
        >
          {saved ? "Saved" : pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
