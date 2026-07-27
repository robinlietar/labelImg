"use client";

import { useState, useTransition } from "react";
import {
  approveSubmission,
  rejectSubmission,
  mergeSubmission,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PLACE_KINDS, KIND_LABEL, type PlaceKind } from "@/lib/places";
import type { Assessment } from "@/lib/assess";
import { Sparkles } from "lucide-react";

export type Submission = {
  id: string;
  payload: Record<string, unknown>;
  claude_assessment: Assessment | null;
  created_at: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Review card: the submitter's original next to Claude's cleaned-up
 * suggestion, editable fields, and approve/merge/reject. Approve publishes
 * whatever is in the fields.
 */
export function SubmissionCard({ sub }: { sub: Submission }) {
  const [pending, start] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const p = sub.payload;
  const a = sub.claude_assessment;

  const [name, setName] = useState(str(p.name));
  const [kind, setKind] = useState(str(p.kind) || "other");
  const [address, setAddress] = useState(str(p.address));
  const [website, setWebsite] = useState(str(p.website));
  const [description, setDescription] = useState(
    str(p.notes) || a?.suggested_copy || "",
  );

  function applySuggestion() {
    const s = a?.suggested;
    if (!s) return;
    if (s.name) setName(s.name);
    if (s.kind && (PLACE_KINDS as readonly string[]).includes(s.kind)) setKind(s.kind);
    if (s.address) setAddress(s.address);
    if (s.website) setWebsite(s.website);
    if (s.description) setDescription(s.description);
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(sub.created_at).toLocaleString()}
        </p>
        {a && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs" title="Claude quality score">
            {(a.quality_score * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Original vs suggestion, side by side on wide, stacked on mobile */}
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-secondary/40 p-2">
          <p className="font-semibold text-muted-foreground">User submitted</p>
          <p className="mt-1">
            {str(p.name) || "(no name)"} ·{" "}
            {KIND_LABEL[str(p.kind) as PlaceKind] ?? str(p.kind)}
          </p>
          <p className="text-muted-foreground">{str(p.address) || "no address"}</p>
          {str(p.when_notes) && <p className="text-muted-foreground">When: {str(p.when_notes)}</p>}
          {str(p.notes) && <p className="italic">{str(p.notes)}</p>}
        </div>
        <div className="rounded-lg bg-accent/60 p-2">
          <p className="font-semibold text-accent-foreground">Claude suggests</p>
          {a?.suggested ? (
            <>
              <p className="mt-1">
                {a.suggested.name ?? str(p.name)} ·{" "}
                {KIND_LABEL[(a.suggested.kind ?? str(p.kind)) as PlaceKind] ??
                  a.suggested.kind ?? str(p.kind)}
              </p>
              <p className="text-muted-foreground">{a.suggested.address ?? "no address"}</p>
              {a.suggested.description && <p className="italic">{a.suggested.description}</p>}
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">No suggestion returned.</p>
          )}
        </div>
      </div>

      {a && (
        <p className="mt-2 text-xs text-muted-foreground">
          real: {a.plausible_real_place ? "yes" : "no"} · chess:{" "}
          {a.chess_relevant ? "yes" : "no"} · duplicate:{" "}
          {a.likely_duplicate_of ? "likely, use Merge below" : "no"}
          {a.issues.length > 0 && <> · issues: {a.issues.join("; ")}</>}
        </p>
      )}

      {/* Editable final version, every field labeled */}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Kind</span>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {PLACE_KINDS.map((k: PlaceKind) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Address</span>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Website</span>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">One-line description</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>

      {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {a?.suggested && (
          <Button size="sm" variant="secondary" onClick={applySuggestion}>
            <Sparkles className="h-3.5 w-3.5" /> Use suggestion
          </Button>
        )}
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await approveSubmission(sub.id, {
                name,
                kind,
                address,
                website,
                description,
              });
              setActionError(res.ok ? null : (res.error ?? "failed"));
            })
          }
        >
          Approve
        </Button>
        {a?.likely_duplicate_of && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(() => mergeSubmission(sub.id, a.likely_duplicate_of!))}
          >
            Merge into duplicate
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(() => rejectSubmission(sub.id))}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
