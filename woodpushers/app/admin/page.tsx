import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { APP } from "@/lib/config";
import { SubmissionCard, type Submission } from "@/components/admin/SubmissionCard";
import { PendingPlaceRow, type PendingPlace } from "@/components/admin/PendingPlaceRow";
import { CityChatEditor, type CityChatRow } from "@/components/admin/CityChatEditor";
import { ReportRow, type ReportItem } from "@/components/admin/ReportRow";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/");

  const svc = createServiceClient();

  const [
    { data: subs },
    { data: places },
    { data: runs },
    { data: cities },
    { data: reports },
  ] = await Promise.all([
    svc
      .from("place_submissions")
      .select("id, payload, claude_assessment, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    svc
      .from("places")
      .select("id, name, kind, address, source, source_url, confidence")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100),
    svc
      .from("scrape_runs")
      .select("id, started_at, finished_at, cities, error")
      .order("started_at", { ascending: false })
      .limit(10),
    svc
      .from("cities")
      .select("id, name, slug, intro, city_chats(whatsapp_invite_url, notes)")
      .in("slug", APP.launchCities as unknown as string[]),
    svc
      .from("reports")
      .select(
        "id, reason, created_at, reporter:profiles!reports_reporter_fkey(handle), reported:profiles!reports_reported_fkey(handle)",
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const submissions = (subs ?? []) as Submission[];
  const pendingPlaces = (places ?? []) as PendingPlace[];
  const cityRows: CityChatRow[] = (cities ?? []).map((c) => {
    const chat = Array.isArray(c.city_chats) ? c.city_chats[0] : c.city_chats;
    return {
      city_id: c.id as number,
      city_name: c.name as string,
      slug: c.slug as string,
      whatsapp_invite_url: chat?.whatsapp_invite_url ?? null,
      notes: chat?.notes ?? null,
      intro: (c.intro as string | null) ?? null,
    };
  });
  const reportRows: ReportItem[] = (reports ?? []).map((r) => {
    const rep = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
    const red = Array.isArray(r.reported) ? r.reported[0] : r.reported;
    return {
      id: r.id as string,
      reason: (r.reason as string | null) ?? null,
      created_at: r.created_at as string,
      reporter_handle: rep?.handle ?? null,
      reported_handle: red?.handle ?? null,
    };
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <Section title={`Submissions (${submissions.length})`}>
        {submissions.length === 0 ? (
          <Empty>No submissions waiting.</Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((s) => (
              <SubmissionCard key={s.id} sub={s} />
            ))}
          </div>
        )}
      </Section>

      <Section title={`Pending scraped places (${pendingPlaces.length})`}>
        {pendingPlaces.length === 0 ? (
          <Empty>Nothing pending.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingPlaces.map((p) => (
              <PendingPlaceRow key={p.id} place={p} />
            ))}
          </div>
        )}
      </Section>

      <Section title={`Reports (${reportRows.length})`}>
        {reportRows.length === 0 ? (
          <Empty>No open reports.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {reportRows.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        )}
      </Section>

      <Section title="City chats">
        <div className="flex flex-col gap-3">
          {cityRows.map((row) => (
            <CityChatEditor key={row.city_id} row={row} />
          ))}
        </div>
      </Section>

      <Section title="Recent scrape runs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Started</th>
                <th className="py-1 pr-3">Finished</th>
                <th className="py-1 pr-3">Cities</th>
                <th className="py-1">Error</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((r) => {
                const arr = Array.isArray(r.cities) ? r.cities : [];
                const inserted = arr.reduce(
                  (n: number, c: { inserted?: number }) => n + (c.inserted ?? 0),
                  0,
                );
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-1.5 pr-3">
                      {new Date(r.started_at).toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3">
                      {r.finished_at
                        ? new Date(r.finished_at).toLocaleTimeString()
                        : "running"}
                    </td>
                    <td className="py-1.5 pr-3">
                      {arr.length} cities, {inserted} added
                    </td>
                    <td className="py-1.5 text-destructive">{r.error ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
