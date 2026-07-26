"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "input" | "code" | "done";

/** chess.com linking via the Location-field code trick. */
export function ChesscomLink({ initialUsername }: { initialUsername: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialUsername ? "input" : "input");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/link/chesscom/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setError(json.error ?? "Could not start");
      setCode(json.code);
      setStep("code");
    } catch {
      setError("Network problem, try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/link/chesscom/verify", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (json.verified) {
        setStep("done");
        router.refresh();
      } else {
        setError(json.error ?? "Not verified yet");
      }
    } catch {
      setError("Network problem, try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return <p className="text-sm text-primary">chess.com verified.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="chess.com username"
          value={username}
          autoCapitalize="none"
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button variant="outline" onClick={start} disabled={busy || !username}>
          {step === "code" ? "New code" : "Link"}
        </Button>
      </div>

      {step === "code" && (
        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
          <p className="font-medium">Prove this account is yours:</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Copy this code:{" "}
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(code)}
                className="rounded bg-background px-2 py-0.5 font-mono font-semibold tracking-widest active:bg-accent"
                title="Tap to copy"
              >
                {code}
              </button>{" "}
              <span className="text-xs text-muted-foreground">(tap to copy)</span>
            </li>
            <li>
              Open{" "}
              <a
                href="https://www.chess.com/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline"
              >
                chess.com/settings
              </a>{" "}
              (sign in if asked). Find the{" "}
              <span className="font-medium">Location</span> field under your
              profile details.
            </li>
            <li>Paste the code there and hit Save.</li>
            <li>Come back here and tap Verify.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            After verifying you can delete the code from your Location again.
          </p>
          <Button className="mt-3" onClick={verify} disabled={busy}>
            {busy ? "Checking..." : "Verify"}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
