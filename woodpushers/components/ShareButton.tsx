"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toaster";
import { Share2 } from "lucide-react";

/**
 * Native share sheet where available (all mobile), copy link elsewhere.
 * Used to invite friends and to share places and cities.
 */
export function ShareButton({
  title,
  text,
  path = "",
  label = "Share",
  variant = "outline",
  className,
}: {
  title: string;
  text: string;
  path?: string;
  label?: string;
  variant?: "outline" | "default" | "ghost" | "secondary";
  className?: string;
}) {
  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast("Link copied");
    } catch {
      // user cancelled the share sheet: not an error
    }
  }

  return (
    <Button variant={variant} onClick={share} className={className}>
      <Share2 className="h-4 w-4" /> {label}
    </Button>
  );
}
