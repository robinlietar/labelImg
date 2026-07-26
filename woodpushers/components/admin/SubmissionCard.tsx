"use client";

import { useTransition } from "react";
import { approveSubmission, rejectSubmission, mergeSubmission } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import type { Assessment } from "@/lib/assess";

export type Submission = {
  id: string;
  payload: Record<string, unknown>;
  claude_assessment: Assessment | null;
  created_at: string;
};

export function SubmissionCard({ sub }: { sub: Submission }) {
  const [pending, start] = useTransition();
  const p = sub.payload;
  const a = sub.claude_assessment;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{String(p.name ?? "Untitled")}</p>
          <p className="text-xs text-muted-foreground">
            {String(p.kind ?? "")} · {String(p.address ?? "no address")}
          </p>
        </div>
        {a && (
          <span
            className="rounded-full bg-secondary px-2 py-0.5 text-xs"
            title="quality score"
          >
            {(a.quality_score * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {p.website ? (
        <a href={String(p.website)} className="mt-1 block text-xs text-primary underline">
          {String(p.website)}
        </a>
      ) : null}
      {p.when_notes ? (
        <p className="mt-1 text-xs text-muted-foreground">When: {String(p.when_notes)}</p>
      ) : null}

      {a && (
        <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs">
          <p>
            real: {a.plausible_real_place ? "yes" : "no"} · chess:{" "}
            {a.chess_relevant ? "yes" : "no"} · duplicate:{" "}
            {a.likely_duplicate_of ?? "no"}
          </p>
          {a.issues.length > 0 && <p className="mt-1">issues: {a.issues.join("; ")}</p>}
          {a.suggested_copy && <p className="mt-1 italic">“{a.suggested_copy}”</p>}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(() => approveSubmission(sub.id))}
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
