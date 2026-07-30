"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "@/components/Toaster";
import { cn } from "@/lib/utils";

/** Optimistic follow toggle. Signed-out taps route to login. */
export function FollowButton({
  profileId,
  initialOn,
  signedIn,
  displayName,
}: {
  profileId: string;
  initialOn: boolean;
  signedIn: boolean;
  displayName: string;
}) {
  const [on, setOn] = useState(initialOn);
  const router = useRouter();

  const toggle = async () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    const next = !on;
    setOn(next);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, on: next }),
      });
      if (!res.ok) throw new Error();
      toast(next ? `You follow ${displayName} now` : `Unfollowed ${displayName}`);
    } catch {
      setOn(!next);
      toast("Could not save, try again.", "error");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium",
        on
          ? "border border-border text-muted-foreground"
          : "bg-primary text-primary-foreground",
      )}
    >
      {on ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {on ? "Following" : "Follow"}
    </button>
  );
}
