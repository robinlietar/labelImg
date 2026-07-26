"use client";

import { useTransition } from "react";
import { resolveReport } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export type ReportItem = {
  id: string;
  reason: string | null;
  created_at: string;
  reporter_handle: string | null;
  reported_handle: string | null;
};

export function ReportRow({ report }: { report: ReportItem }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 text-sm">
        <p className="text-xs text-muted-foreground">
          {new Date(report.created_at).toLocaleString()} ·{" "}
          {report.reporter_handle ? `@${report.reporter_handle}` : "unknown"}
          {report.reported_handle ? (
            <>
              {" "}
              reported <span className="font-medium">@{report.reported_handle}</span>
            </>
          ) : (
            " reported a place"
          )}
        </p>
        <p className="mt-1 break-words">{report.reason ?? "(no reason given)"}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(() => resolveReport(report.id))}
      >
        Resolve
      </Button>
    </div>
  );
}
