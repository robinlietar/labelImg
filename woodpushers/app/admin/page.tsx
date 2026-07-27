import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { APP } from "@/lib/config";
import { cn } from "@/lib/utils";
import { SubmissionCard, type Submission } from "@/components/admin/SubmissionCard";
import { EditablePlaceCard, type AdminPlace } from "@/components/admin/EditablePlaceCard";
import { CityChatEditor, type CityChatRow } from "@/components/admin/CityChatEditor";
import { ReportRow, type ReportItem } from "@/components/admin/ReportRow";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pending", label: "Scraped queue" },
  { key: "submissions", label: "Submissions" },
  { key: "places", label: "All places" },
  { key: "chats", label: "WhatsApp" },
  { key: "runs", label: "Scrape runs" },
  { key: "reports", label: "Reports" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; pq?: string; ps?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/");
  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "dashboard") as TabKey;
  const pq = sp.pq ?? "";
  const ps = ["approved","pending","rejected"].includes(sp.ps ?? "") ? sp.ps! : "";

  const svc = createServiceClient();

  // Cheap counts for the tab badges.
  const [pendingCount, subCount, reportCount] = await Promise.all([
    svc.from("places").select("id", { count: "exact", head: true }).eq("status", "pending"),
    svc.from("place_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]).then((rs) => rs.map((r) => r.count ?? 0));
  const badges: Partial<Record<TabKey, number>> = {
    pending: pendingCount,
    submissions: subCount,
    reports: reportCount,
  };

  return (
    <main className="w-full px-4 pb-16 pt-6 md:px-0">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* Tab bar */}
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {(badges[t.key] ?? 0) > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-secondary px-1 text-xs">
                {badges[t.key]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {tab === "dashboard" && <DashboardTab svc={svc} />}
        {tab === "pending" && <PendingTab svc={svc} />}
        {tab === "submissions" && <SubmissionsTab svc={svc} />}
        {tab === "places" && <PlacesTab svc={svc} pq={pq} ps={ps} />}
        {tab === "chats" && <ChatsTab svc={svc} />}
        {tab === "runs" && <RunsTab svc={svc} />}
        {tab === "reports" && <ReportsTab svc={svc} />}
      </div>
    </main>
  );
}

type Svc = ReturnType<typeof createServiceClient>;

async function DashboardTab({ svc }: { svc: Svc }) {
  const { data, error } = await svc.rpc("admin_stats");
  let st = (data ?? {}) as Record<string, number>;
  let degraded = false;
  if (error || !data) {
    // admin_stats is not in the database yet (upgrade.sql not applied) or
    // failed: compute the tiles with direct queries so the dashboard is
    // never a wall of fake zeros.
    degraded = true;
    const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
    const count = async (q: PromiseLike<{ count: number | null }>) =>
      (await q).count ?? 0;
    const [
      usersTotal, usersNew, usersActive, usersVisible,
      messagesTotal, messages7d, convTotal,
      placesApproved, placesPending, subs7d, signals, chatReqs,
      citiesScraped, openNow,
    ] = await Promise.all([
      count(svc.from("profiles").select("id", { count: "exact", head: true })),
      count(svc.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7)),
      count(svc.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", since7)),
      count(svc.from("profiles").select("id", { count: "exact", head: true }).eq("visible", true)),
      count(svc.from("messages").select("id", { count: "exact", head: true })),
      count(svc.from("messages").select("id", { count: "exact", head: true }).gte("created_at", since7)),
      count(svc.from("conversations").select("id", { count: "exact", head: true })),
      count(svc.from("places").select("id", { count: "exact", head: true }).eq("status", "approved")),
      count(svc.from("places").select("id", { count: "exact", head: true }).eq("status", "pending")),
      count(svc.from("place_submissions").select("id", { count: "exact", head: true }).gte("created_at", since7)),
      count(svc.from("place_signals").select("place_id", { count: "exact", head: true })),
      count(svc.from("city_chat_requests").select("id", { count: "exact", head: true })),
      count(svc.from("cities").select("id", { count: "exact", head: true }).not("last_scraped_at", "is", null)),
      count(svc.from("profiles").select("id", { count: "exact", head: true }).gt("open_today_until", new Date().toISOString())),
    ]);
    st = {
      users_total: usersTotal, users_new_7d: usersNew,
      users_active_7d: usersActive, users_visible: usersVisible,
      users_linked: -1, messages_total: messagesTotal, messages_7d: messages7d,
      conversations_total: convTotal, conversations_active_7d: -1,
      encounters_likely: -1, places_approved: placesApproved,
      places_pending: placesPending, submissions_7d: subs7d,
      signals_total: signals, chat_requests: chatReqs,
      cities_scraped: citiesScraped, open_today_now: openNow,
    };
  }
  const fmt = (v: number | undefined) => (v == null || v < 0 ? "n/a" : v);
  const tiles: Array<[string, number | string, string?]> = [
    ["Users", fmt(st.users_total), `${fmt(st.users_new_7d)} new this week`],
    ["Active this week", fmt(st.users_active_7d), `${fmt(st.users_visible)} visible in directory`],
    ["Linked accounts", fmt(st.users_linked), "lichess or chess.com verified"],
    ["Messages", fmt(st.messages_total), `${fmt(st.messages_7d)} this week`],
    ["Conversations", fmt(st.conversations_total), `${fmt(st.conversations_active_7d)} active this week`],
    ["Likely encounters", fmt(st.encounters_likely), "chats with meetup language"],
    ["Places live", fmt(st.places_approved), `${fmt(st.places_pending)} pending review`],
    ["I-play-here signals", fmt(st.signals_total), `${fmt(st.submissions_7d)} submissions this week`],
    ["Cities scraped", fmt(st.cities_scraped), `${fmt(st.chat_requests)} city chat requests`],
    ["Up for a game now", fmt(st.open_today_now), "open-today flags active"],
  ];
  return (
    <div>
      {degraded && (
        <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Full stats need the latest database upgrade: run supabase/upgrade.sql
          in the Supabase SQL Editor. Showing direct counts meanwhile; tiles
          showing n/a need the upgrade.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="rounded-xl border border-border p-4">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-0.5 text-sm font-medium">{label}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Encounters are estimated from meetup language in messages (aggregate
        count only, message contents are never shown here).
      </p>
    </div>
  );
}

async function PendingTab({ svc }: { svc: Svc }) {
  const { data } = await svc.rpc("admin_places", {
    q: null,
    only_pending: true,
    max_count: 100,
  });
  const places = (data ?? []) as AdminPlace[];
  if (places.length === 0) return <Empty>Nothing waiting for review.</Empty>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Tap a row to expand, edit, and approve or reject.
      </p>
      {places.map((p) => (
        <EditablePlaceCard key={p.id} place={p} />
      ))}
    </div>
  );
}

async function SubmissionsTab({ svc }: { svc: Svc }) {
  const { data } = await svc
    .from("place_submissions")
    .select("id, payload, claude_assessment, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  const submissions = (data ?? []) as Submission[];
  if (submissions.length === 0) return <Empty>No submissions waiting.</Empty>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {submissions.map((s) => (
        <SubmissionCard key={s.id} sub={s} />
      ))}
    </div>
  );
}

async function PlacesTab({ svc, pq, ps }: { svc: Svc; pq: string; ps: string }) {
  const searched: AdminPlace[] =
    pq || ps
      ? (((await svc.rpc("admin_places", {
          q: pq || null,
          only_pending: false,
          max_count: 30,
          p_status: ps || null,
        })).data ?? []) as AdminPlace[])
      : [];
  return (
    <div>
      <form method="get" className="flex max-w-xl gap-2">
        <input type="hidden" name="tab" value="places" />
        <input
          type="search"
          name="pq"
          defaultValue={pq}
          placeholder="Search any place by name or address"
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
        <button className="h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>
      <div className="mt-2 flex gap-2 text-xs">
        {["", "approved", "pending", "rejected"].map((v) => (
          <a
            key={v || "all"}
            href={`/admin?tab=places&pq=${encodeURIComponent(pq)}&ps=${v}`}
            className={cn(
              "rounded-full border px-3 py-1",
              ps === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {v || "all"}
          </a>
        ))}
      </div>
      {(pq || ps) &&
        (searched.length === 0 ? (
          <Empty>No matches.</Empty>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {searched.map((p) => (
              <EditablePlaceCard key={p.id} place={p} />
            ))}
          </div>
        ))}
      {!pq && !ps && <Empty>Search or pick a status to list places.</Empty>}
    </div>
  );
}

async function ChatsTab({ svc }: { svc: Svc }) {
  const { data } = await svc
    .from("cities")
    .select("id, name, slug, intro, city_chats(whatsapp_invite_url, notes)")
    .in("slug", APP.launchCities as unknown as string[]);
  const rows: CityChatRow[] = (data ?? []).map((c) => {
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
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((row) => (
        <CityChatEditor key={row.city_id} row={row} />
      ))}
    </div>
  );
}

async function RunsTab({ svc }: { svc: Svc }) {
  const { data } = await svc
    .from("scrape_runs")
    .select("id, started_at, finished_at, cities, error")
    .order("started_at", { ascending: false })
    .limit(20);
  const runs = data ?? [];
  if (runs.length === 0) return <Empty>No scrape runs yet. The cron runs daily at 03:00 UTC.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1.5 pr-3">Started</th>
            <th className="py-1.5 pr-3">Finished</th>
            <th className="py-1.5 pr-3">Cities</th>
            <th className="py-1.5 pr-3">Found (OSM / research)</th>
            <th className="py-1.5 pr-3">Inserted</th>
            <th className="py-1.5">Errors</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const arr = (Array.isArray(r.cities) ? r.cities : []) as Array<{
              slug?: string;
              osm_found?: number;
              claude_found?: number;
              inserted?: number;
              error?: string;
            }>;
            const osm = arr.reduce((n, c) => n + (c.osm_found ?? 0), 0);
            const res = arr.reduce((n, c) => n + (c.claude_found ?? 0), 0);
            const inserted = arr.reduce((n, c) => n + (c.inserted ?? 0), 0);
            const cityErrors = arr.filter((c) => c.error).map((c) => c.slug);
            return (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="py-2 pr-3">{new Date(r.started_at).toLocaleString()}</td>
                <td className="py-2 pr-3">
                  {r.finished_at
                    ? new Date(r.finished_at).toLocaleTimeString()
                    : Date.now() - new Date(r.started_at).getTime() > 15 * 60000
                      ? "timed out (partial results saved)"
                      : "running"}
                </td>
                <td className="py-2 pr-3">
                  {arr.map((c) => c.slug).filter(Boolean).join(", ") || "-"}
                </td>
                <td className="py-2 pr-3">{osm} / {res}</td>
                <td className="py-2 pr-3 font-medium">{inserted}</td>
                <td className="py-2 text-destructive">
                  {r.error ?? (cityErrors.length ? cityErrors.join(", ") : "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ReportsTab({ svc }: { svc: Svc }) {
  const { data } = await svc
    .from("reports")
    .select(
      "id, reason, created_at, reporter:profiles!reports_reporter_fkey(handle), reported:profiles!reports_reported_fkey(handle)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows: ReportItem[] = (data ?? []).map((r) => {
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
  if (rows.length === 0) return <Empty>No open reports.</Empty>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <ReportRow key={r.id} report={r} />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-sm text-muted-foreground">{children}</p>;
}
