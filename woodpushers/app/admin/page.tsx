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
import { Avatar } from "@/components/Avatar";
import { relTime } from "@/lib/time";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "users", label: "Users" },
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
  searchParams: Promise<{ tab?: string; pq?: string; ps?: string; cq?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdmin(user.id)) redirect("/");
  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "dashboard") as TabKey;
  const pq = (sp.pq ?? "").trim();
  const ps = ["approved","pending","rejected"].includes(sp.ps ?? "") ? sp.ps! : "";
  const cq = (sp.cq ?? "").trim();

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
        {tab === "users" && <UsersTab svc={svc} />}
        {tab === "pending" && <PendingTab svc={svc} />}
        {tab === "submissions" && <SubmissionsTab svc={svc} />}
        {tab === "places" && <PlacesTab svc={svc} pq={pq} ps={ps} />}
        {tab === "chats" && <ChatsTab svc={svc} cq={cq} />}
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

type UserProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  visible: boolean;
  created_at: string;
  last_seen_at: string | null;
  lichess_username: string | null;
  lichess_verified: boolean;
  chesscom_username: string | null;
  chesscom_verified: boolean;
  home_city:
    | { name: string; country_code: string }
    | Array<{ name: string; country_code: string }>
    | null;
};

async function UsersTab({ svc }: { svc: Svc }) {
  const [{ data: profData }, authRes] = await Promise.all([
    svc
      .from("profiles")
      .select(
        "id, handle, display_name, avatar_url, visible, created_at, last_seen_at, lichess_username, lichess_verified, chesscom_username, chesscom_verified, home_city:cities(name, country_code)",
      )
      .limit(1000),
    svc.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => null),
  ]);
  const profiles = new Map(
    ((profData ?? []) as UserProfileRow[]).map((p) => [p.id, p]),
  );
  const authUsers = authRes?.data?.users ?? [];
  // Every registered account, even before onboarding. If the auth admin API
  // ever fails, fall back to profiles so the tab is never empty.
  const base = authUsers.length
    ? authUsers.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }))
    : ((profData ?? []) as UserProfileRow[]).map((p) => ({
        id: p.id,
        email: null,
        created_at: p.created_at,
        last_sign_in_at: null,
      }));
  base.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (base.length === 0) return <Empty>No users yet.</Empty>;

  const acct = (name: string | null, verified: boolean) =>
    name ? `${name}${verified ? "" : " (unverified)"}` : null;

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {base.length} registered {base.length === 1 ? "user" : "users"},{" "}
        {profiles.size} onboarded. Newest first.
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-3">User</th>
              <th className="py-1.5 pr-3">Email</th>
              <th className="py-1.5 pr-3">City</th>
              <th className="py-1.5 pr-3">Chess accounts</th>
              <th className="py-1.5 pr-3">Joined</th>
              <th className="py-1.5 pr-3">Last seen</th>
              <th className="py-1.5">Visible</th>
            </tr>
          </thead>
          <tbody>
            {base.map((u) => {
              const p = profiles.get(u.id);
              const city = p
                ? Array.isArray(p.home_city)
                  ? p.home_city[0]
                  : p.home_city
                : null;
              const accounts = p
                ? [
                    acct(p.lichess_username, p.lichess_verified),
                    acct(p.chesscom_username, p.chesscom_verified),
                  ].filter(Boolean)
                : [];
              return (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <Avatar url={p?.avatar_url ?? null} size={28} />
                      <span>
                        <span className="block font-medium">
                          {p?.display_name ?? "Not onboarded"}
                        </span>
                        {p && (
                          <span className="block text-xs text-muted-foreground">
                            @{p.handle}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="select-text py-2 pr-3 text-muted-foreground">
                    {u.email ?? "n/a"}
                  </td>
                  <td className="py-2 pr-3">
                    {city ? `${city.name}, ${city.country_code}` : "-"}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {accounts.length ? accounts.join(" · ") : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {relTime(p?.last_seen_at ?? u.last_sign_in_at)}
                  </td>
                  <td className="py-2">{p ? (p.visible ? "yes" : "hidden") : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  // No filters means browse everything, one section per city, A to Z.
  const LIMIT = 1000;
  const [{ data }, { count }] = await Promise.all([
    svc.rpc("admin_places", {
      q: pq || null,
      only_pending: false,
      max_count: LIMIT,
      p_status: ps || null,
    }),
    svc.from("places").select("id", { count: "exact", head: true }),
  ]);
  const places = (data ?? []) as AdminPlace[];
  const total = count ?? 0;

  const byCity = new Map<string, AdminPlace[]>();
  for (const p of places) {
    const key = p.city_name ?? "No city assigned";
    const list = byCity.get(key);
    if (list) list.push(p);
    else byCity.set(key, [p]);
  }
  const sections = [...byCity.entries()].sort(([a], [b]) =>
    a === "No city assigned" ? 1 : b === "No city assigned" ? -1 : a.localeCompare(b),
  );
  for (const [, list] of sections) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
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
      {places.length === 0 ? (
        <Empty>{pq || ps ? "No matches." : "No places yet."}</Empty>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            {pq || ps
              ? `${places.length} ${places.length === 1 ? "match" : "matches"} in ${sections.length} ${sections.length === 1 ? "city" : "cities"}`
              : `${total} places in ${sections.length} cities, A to Z`}
            {places.length === LIMIT && ` (first ${LIMIT} shown, search to narrow down)`}
          </p>
          {sections.map(([cityName, list]) => (
            <section key={cityName} className="mt-4">
              <h2 className="flex items-baseline gap-2 text-sm font-semibold">
                {cityName}
                <span className="text-xs font-normal text-muted-foreground">
                  {list.length}
                </span>
              </h2>
              <div className="mt-1.5 flex flex-col gap-2">
                {list.map((p) => (
                  <EditablePlaceCard key={p.id} place={p} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

type CityWithChat = {
  id: number;
  name: string;
  country_code?: string | null;
  slug: string;
  intro: string | null;
  city_chats:
    | { whatsapp_invite_url: string | null; notes: string | null }
    | Array<{ whatsapp_invite_url: string | null; notes: string | null }>
    | null;
};

async function ChatsTab({ svc, cq }: { svc: Svc; cq: string }) {
  const CITY_SELECT =
    "id, name, country_code, slug, intro, city_chats(whatsapp_invite_url, notes)";
  const [launch, withChat, search, reqs] = await Promise.all([
    svc.from("cities").select(CITY_SELECT).in("slug", APP.launchCities as unknown as string[]),
    // Any city that already has a chat row, wherever it came from.
    svc
      .from("cities")
      .select(
        "id, name, country_code, slug, intro, city_chats!inner(whatsapp_invite_url, notes)",
      ),
    cq
      ? svc
          .from("cities")
          .select(CITY_SELECT)
          .ilike("name", `%${cq}%`)
          .order("population", { ascending: false, nullsFirst: false })
          .limit(12)
      : Promise.resolve({ data: [] as CityWithChat[] }),
    svc.from("city_chat_requests").select("city_id, city:cities(id, name, country_code, slug, intro)"),
  ]);

  const reqCount = new Map<number, number>();
  for (const r of (reqs.data ?? []) as Array<{ city_id: number | null }>) {
    if (r.city_id != null) reqCount.set(r.city_id, (reqCount.get(r.city_id) ?? 0) + 1);
  }

  const toRow = (c: CityWithChat): CityChatRow => {
    const chat = Array.isArray(c.city_chats) ? c.city_chats[0] : c.city_chats;
    return {
      city_id: c.id,
      city_name: c.country_code ? `${c.name}, ${c.country_code}` : c.name,
      slug: c.slug,
      whatsapp_invite_url: chat?.whatsapp_invite_url ?? null,
      notes: chat?.notes ?? null,
      intro: c.intro ?? null,
    };
  };

  const searchRows = ((search.data ?? []) as CityWithChat[]).map(toRow);
  const current = new Map<number, CityChatRow>();
  for (const c of [
    ...((withChat.data ?? []) as CityWithChat[]),
    ...((launch.data ?? []) as CityWithChat[]),
  ]) {
    if (!current.has(c.id)) current.set(c.id, toRow(c));
  }
  const currentRows = [...current.values()].sort((a, b) =>
    a.city_name.localeCompare(b.city_name),
  );

  // Cities users asked a group for that have no editor row above yet.
  const requested = new Map<number, CityChatRow>();
  for (const r of (reqs.data ?? []) as Array<{
    city_id: number | null;
    city: CityWithChat | CityWithChat[] | null;
  }>) {
    const c = Array.isArray(r.city) ? r.city[0] : r.city;
    if (c && !current.has(c.id) && !requested.has(c.id)) {
      requested.set(c.id, toRow({ ...c, city_chats: null }));
    }
  }
  const requestedRows = [...requested.values()].sort(
    (a, b) => (reqCount.get(b.city_id) ?? 0) - (reqCount.get(a.city_id) ?? 0),
  );

  const withRequests = (row: CityChatRow) => {
    const n = reqCount.get(row.city_id) ?? 0;
    return (
      <div key={row.city_id}>
        {n > 0 && (
          <p className="mb-1 text-xs text-primary">
            {n} {n === 1 ? "person" : "people"} requested this group
          </p>
        )}
        <CityChatEditor row={row} />
      </div>
    );
  };

  return (
    <div>
      <form method="get" className="flex max-w-xl gap-2">
        <input type="hidden" name="tab" value="chats" />
        <input
          type="search"
          name="cq"
          defaultValue={cq}
          placeholder="Search any city to add a WhatsApp group"
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
        <button className="h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      {cq && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">Search results</h2>
          {searchRows.length === 0 ? (
            <Empty>No city matches &quot;{cq}&quot;.</Empty>
          ) : (
            <div className="mt-1.5 grid gap-3 lg:grid-cols-2">
              {searchRows.map(withRequests)}
            </div>
          )}
        </section>
      )}

      {requestedRows.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold">Requested by users</h2>
          <div className="mt-1.5 grid gap-3 lg:grid-cols-2">
            {requestedRows.map(withRequests)}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-sm font-semibold">Current groups</h2>
        <div className="mt-1.5 grid gap-3 lg:grid-cols-2">
          {currentRows.map(withRequests)}
        </div>
      </section>
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
            const cityErrors = arr
              .filter((c) => c.error)
              .map((c) => `${c.slug}: ${c.error}`);
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
                <td className="max-w-xs select-text py-2 text-xs text-destructive">
                  {r.error ?? (cityErrors.length ? cityErrors.join("; ") : "")}
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
