"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toaster";

/** Edit your profile description. Saves directly (bio is a safe column). */
export function BioEditor({
  userId,
  initialBio,
}: {
  userId: string;
  initialBio: string | null;
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = bio !== (initialBio ?? "");

  async function save() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ bio: bio.trim() || null })
        .eq("id", userId);
      if (error) throw error;
      toast("Profile updated");
      router.refresh();
    } catch {
      toast("Could not save, try again", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold">About you</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Shown on your public profile. Favourite openings, how you like to play,
        where people can find you.
      </p>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        maxLength={400}
        placeholder="Caro-Kann devotee, up for rapid most evenings..."
        className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{bio.length}/400</span>
        <Button size="sm" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
