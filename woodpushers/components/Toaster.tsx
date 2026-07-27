"use client";

import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

/** Fire a disappearing popup from anywhere in client code. */
export function toast(message: string, kind: ToastKind = "success") {
  window.dispatchEvent(
    new CustomEvent("wp:toast", { detail: { message, kind } }),
  );
}

let nextId = 1;

/** Global toast stack, floats above the tab bar, auto-dismisses. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail as {
        message: string;
        kind: ToastKind;
      };
      const id = nextId++;
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        2600,
      );
    };
    window.addEventListener("wp:toast", onToast);
    return () => window.removeEventListener("wp:toast", onToast);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "animate-in fade-in slide-in-from-bottom-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg " +
            (t.kind === "error"
              ? "bg-destructive text-destructive-foreground"
              : t.kind === "info"
                ? "bg-foreground text-background"
                : "bg-primary text-primary-foreground")
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
