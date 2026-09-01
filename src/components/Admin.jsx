import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, Input, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Modal } from "./ui/Layout.jsx";

// Admin panel.
//
// Every read and write here is a plain Supabase call governed by the policies
// in schema_admin_panel.sql. There is no client-side "am I an admin" shortcut
// deciding what is allowed: the panel asks, and the database answers. A
// forged is_admin in local state would still get zero rows back.
//
// Which means the panel is honest about failure. If a section returns nothing
// it says whether that is because there is nothing, or because the request
// was refused, rather than rendering an empty table either way.

const SECTIONS = [
  { key: "overview", label: "Overview", icon: "monitoring" },
  { key: "communities", label: "Communities", icon: "groups" },
  { key: "posts", label: "Posts", icon: "article" },
  { key: "media", label: "Images", icon: "image" },
  { key: "users", label: "Users", icon: "person" },
  { key: "reports", label: "Reports", icon: "flag" },
  { key: "tea", label: "Locali-Tea", icon: "local_cafe" },
  { key: "events", label: "Events", icon: "confirmation_number" },
];

const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const when = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString();
};

/* ------------------------------------------------------------- helpers */

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-2xl font-bold tabular-nums text-ink leading-none">{fmt(value)}</p>
      <p className="text-xs text-ink-2 mt-1.5 truncate">{label}</p>
      {sub != null && <p className="text-2xs text-ink-3 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// One place that decides what an empty result means, so no section can
// quietly render a blank table over a refused request.
function Result({ loading, error, empty, emptyText, children }) {
  if (loading) {
    return (
      <div className="py-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded bg-bg-sunken animate-pulse" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8">
        <p className="text-base font-bold text-danger">Request refused</p>
        <p className="text-base text-ink-2 mt-1.5 max-w-prose leading-relaxed">{error}</p>
        <p className="text-xs text-ink-3 mt-3 font-mono">
          Usually means schema_admin_panel.sql has not been run, or Supabase cannot identify you
          (see the header of that file).
        </p>
      </div>
    );
  }
  if (empty) return <p className="text-base text-ink-2 py-8">{emptyText}</p>;
  return children;
}

function Table({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-line">
            {head.map((h) => (
              <th
                key={h}
                className="py-2.5 pr-4 text-2xs font-bold uppercase tracking-[0.08em] text-ink-3 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

const Td = ({ children, className }) => (
  <td className={cx("py-3 pr-4 text-base text-ink align-top", className)}>{children}</td>
);

// Destructive actions ask once, inline, rather than through a dialog. The
// row itself becomes the confirmation, so you can see what you are removing.
function DangerButton({ label = "Delete", onConfirm, busy }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <Button variant="ghost" size="xs" onClick={() => setArmed(true)} className="text-danger">
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Button variant="danger" size="xs" onClick={onConfirm} loading={busy}>Confirm</Button>
      <Button variant="ghost" size="xs" onClick={() => setArmed(false)}>Cancel</Button>
    </span>
  );
}

/* ------------------------------------------------------------- Panel */

export function AdminPanel({ user, onBack, onToast }) {
  const [section, setSection] = useState("overview");

  const [state, setState] = useState({ loading: true, error: null });
  const [overview, setOverview] = useState(null);
  const [daily, setDaily] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [tea, setTea] = useState([]);
  const [events, setEvents] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setState({ loading: true, error: null });

    const [ov, dy, com, po, us, rep, te, ev] = await Promise.all([
      supabase.from("admin_dashboard_overview").select("*").maybeSingle(),
      supabase.from("admin_daily_activity").select("*"),
      supabase.from("communities").select("*").order("created_at", { ascending: false }),
      supabase
        .from("community_posts")
        .select("id, community_id, author_id, text, has_image, image_url, spark_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("id, name, email, interests, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("tea_posts").select("id, text, category, true_count, cap_count, comment_count, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
    ]);

    // One refusal is enough to say the panel is not authorised; report the
    // first real error rather than eight identical ones.
    const firstErr = [ov, dy, com, po, us, rep, te, ev].map((r) => r.error).find(Boolean);

    setOverview(ov.data || null);
    setDaily(dy.data || []);
    setCommunities(com.data || []);
    setPosts(po.data || []);
    setUsers(us.data || []);
    setReports(rep.data || []);
    setTea(te.data || []);
    setEvents(ev.data || []);
    setState({ loading: false, error: firstErr ? firstErr.message : null });
  }, []);

  useEffect(() => { load(); }, [load]);

  const communityName = useCallback(
    (id) => communities.find((c) => c.id === id)?.name?.split(" — ")[0] || "—",
    [communities]
  );
  const userName = useCallback(
    (id) => users.find((u) => u.id === id)?.name || "—",
    [users]
  );

  const withImages = useMemo(() => posts.filter((p) => p.image_url), [posts]);
  const openReports = useMemo(() => reports.filter((r) => !r.resolved), [reports]);

  /* ---- mutations ---- */

  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    const { error } = await fn();
    setBusyId(null);
    if (error) { onToast?.(`Refused: ${error.message}`); return false; }
    onToast?.(okMsg);
    await load();
    return true;
  };

  const delPost = (p) =>
    run(p.id, () => supabase.from("community_posts").delete().eq("id", p.id), "Post removed");
  const delCommunity = (c) =>
    run(c.id, () => supabase.from("communities").delete().eq("id", c.id), "Community removed");
  const delTea = (t) =>
    run(t.id, () => supabase.from("tea_posts").delete().eq("id", t.id), "Tea post removed");
  const delEvent = (e) =>
    run(e.id, () => supabase.from("events").delete().eq("id", e.id), "Event removed");
  const toggleOfficial = (c) =>
    run(c.id, () => supabase.from("communities").update({ official: !c.official }).eq("id", c.id),
      c.official ? "Unmarked as official" : "Marked official");
  const resolveReport = (r) =>
    run(r.id, () => supabase.from("reports").update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", r.id),
      "Report resolved");

  const common = { loading: state.loading, error: state.error };

  return (
    <Screen>
      <div className="w-full px-5 sm:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-bold text-ink">Admin</h1>
              <span className="inline-flex items-center h-6 px-2 rounded-full bg-danger-wash text-danger text-2xs font-bold uppercase tracking-wide">
                Restricted
              </span>
            </div>
            <p className="text-base text-ink-2 mt-1.5">
              Signed in as {user?.name || "—"}. Every action here is checked by the database, not this page.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="md" icon="refresh" onClick={load} loading={state.loading}>
              Refresh
            </Button>
            <Button variant="outline" size="md" onClick={onBack}>Back to app</Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* Rail */}
          <nav className="w-full lg:w-56 shrink-0 lg:sticky lg:top-8">
            <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
              {SECTIONS.map((s) => {
                const on = section === s.key;
                const badge =
                  s.key === "reports" ? openReports.length :
                  s.key === "posts" ? posts.length :
                  s.key === "communities" ? communities.length :
                  s.key === "users" ? users.length :
                  s.key === "media" ? withImages.length :
                  s.key === "tea" ? tea.length :
                  s.key === "events" ? events.length : null;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSection(s.key)}
                    className={cx(
                      "flex items-center gap-3 rounded-full px-3.5 py-2.5 shrink-0 text-left transition-colors",
                      on ? "bg-black/[0.05] dark:bg-white/[0.08]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon name={s.icon} size={20} className={on ? "text-accent" : "text-ink-3"} />
                    <span className={cx("text-base truncate flex-1", on ? "font-bold text-ink" : "font-medium text-ink")}>
                      {s.label}
                    </span>
                    {badge != null && badge > 0 && (
                      <span
                        className={cx(
                          "font-mono text-2xs tabular-nums shrink-0",
                          s.key === "reports" && openReports.length > 0 ? "text-danger font-bold" : "text-ink-3"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Panel */}
          <div className="flex-1 min-w-0 w-full">

            {section === "overview" && (
              <Result {...common} empty={!overview && !communities.length} emptyText="Nothing to report yet.">
                <div className="space-y-8">
                  <section>
                    <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">People</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <Stat label="Total users" value={overview?.total_users ?? users.length} />
                      <Stat label="New today" value={overview?.new_users_today} />
                      <Stat label="New this week" value={overview?.new_users_7d} />
                      <Stat label="Memberships" value={overview?.total_memberships} />
                    </div>
                  </section>

                  <section>
                    <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">Content</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <Stat label="Communities" value={overview?.total_communities ?? communities.filter((c) => !c.official).length} />
                      <Stat label="Official clubs" value={overview?.total_clubs ?? communities.filter((c) => c.official).length} />
                      <Stat label="Posts" value={overview?.total_posts ?? posts.length} sub={`${fmt(overview?.posts_today)} today`} />
                      <Stat label="Chat messages" value={overview?.total_messages} sub={`${fmt(overview?.messages_today)} today`} />
                    </div>
                  </section>

                  <section>
                    <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">Locali-Tea &amp; moderation</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <Stat label="Tea posts" value={overview?.total_tea_posts} />
                      <Stat label="Confessions" value={overview?.total_confessions} />
                      <Stat label="Reports" value={overview?.total_reports ?? reports.length} />
                      <Stat label="Unresolved" value={overview?.unresolved_reports ?? openReports.length} />
                    </div>
                  </section>

                  {daily.length > 0 && (
                    <section>
                      <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">Last 14 days</h2>
                      <Table head={["Day", "New users", "Posts", "Messages", "Tea"]}>
                        {daily.map((d) => (
                          <tr key={d.day}>
                            <Td className="font-mono text-sm whitespace-nowrap">{d.day}</Td>
                            <Td className="font-mono tabular-nums">{fmt(d.new_users)}</Td>
                            <Td className="font-mono tabular-nums">{fmt(d.posts)}</Td>
                            <Td className="font-mono tabular-nums">{fmt(d.messages)}</Td>
                            <Td className="font-mono tabular-nums">{fmt(d.tea_posts)}</Td>
                          </tr>
                        ))}
                      </Table>
                    </section>
                  )}
                </div>
              </Result>
            )}

            {section === "communities" && (
              <>
                <div className="flex items-center justify-between gap-3 pb-2.5 mb-4 border-b-2 border-ink">
                  <h2 className="text-base font-bold text-ink">Communities <span className="font-mono text-xs text-ink-3">{communities.length}</span></h2>
                  <Button tone="blue" size="sm" icon="add" onClick={() => setCreating(true)}>New community</Button>
                </div>
                <Result {...common} empty={!communities.length} emptyText="No communities yet.">
                  <Table head={["Name", "Category", "Members", "Official", "Created", ""]}>
                    {communities.map((c) => (
                      <tr key={c.id}>
                        <Td>
                          <span className="font-semibold">{c.name?.split(" — ")[0]}</span>
                          <span className="block text-2xs text-ink-3 font-mono mt-0.5">@{c.handle}</span>
                        </Td>
                        <Td className="text-ink-2 whitespace-nowrap">{c.category}</Td>
                        <Td className="font-mono tabular-nums">{fmt(c.member_count)}</Td>
                        <Td>
                          <button
                            onClick={() => toggleOfficial(c)}
                            className={cx(
                              "inline-flex items-center h-6 px-2 rounded-full text-2xs font-bold transition-colors",
                              c.official ? "bg-accent-wash text-accent" : "bg-bg-sunken text-ink-3 hover:text-ink"
                            )}
                          >
                            {c.official ? "Official" : "Student"}
                          </button>
                        </Td>
                        <Td className="text-ink-2 whitespace-nowrap">{when(c.created_at)}</Td>
                        <Td><DangerButton onConfirm={() => delCommunity(c)} busy={busyId === c.id} /></Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}

            {section === "posts" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Posts <span className="font-mono text-xs text-ink-3">{posts.length}</span>
                </h2>
                <Result {...common} empty={!posts.length} emptyText="No posts yet.">
                  <Table head={["Post", "Community", "Author", "Sparks", "Posted", ""]}>
                    {posts.map((p) => (
                      <tr key={p.id}>
                        <Td className="max-w-md">
                          <span className="line-clamp-2">{p.text || <em className="text-ink-3">image only</em>}</span>
                          {p.image_url && (
                            <span className="inline-flex items-center gap-1 text-2xs text-ink-3 mt-1">
                              <Icon name="image" size={12} />has image
                            </span>
                          )}
                        </Td>
                        <Td className="text-ink-2 whitespace-nowrap">{communityName(p.community_id)}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{userName(p.author_id)}</Td>
                        <Td className="font-mono tabular-nums">{fmt(p.spark_count)}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{when(p.created_at)}</Td>
                        <Td><DangerButton label="Remove" onConfirm={() => delPost(p)} busy={busyId === p.id} /></Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}

            {section === "media" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Images <span className="font-mono text-xs text-ink-3">{withImages.length}</span>
                </h2>
                <Result {...common} empty={!withImages.length} emptyText="No images posted yet.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {withImages.map((p) => (
                      <figure key={p.id} className="card overflow-hidden">
                        <img src={p.image_url} alt="" loading="lazy" className="w-full h-40 object-cover media" />
                        <figcaption className="p-3">
                          <p className="text-xs text-ink-2 line-clamp-2">{p.text || <em>No caption</em>}</p>
                          <p className="text-2xs text-ink-3 mt-1.5 truncate">
                            {communityName(p.community_id)} · {when(p.created_at)}
                          </p>
                          <div className="flex items-center gap-2 mt-2.5">
                            <a
                              href={p.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-2xs font-semibold text-accent hover:opacity-70"
                            >
                              Open full size
                            </a>
                            <span className="ml-auto">
                              <DangerButton label="Remove" onConfirm={() => delPost(p)} busy={busyId === p.id} />
                            </span>
                          </div>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </Result>
              </>
            )}

            {section === "users" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Users <span className="font-mono text-xs text-ink-3">{users.length}</span>
                </h2>
                <Result {...common} empty={!users.length} emptyText="No users yet.">
                  <Table head={["Name", "Email", "Interests", "Joined"]}>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <Td>
                          <span className="inline-flex items-center gap-2.5">
                            <Avatar name={u.name} size={28} />
                            <span className="font-semibold">{u.name || <em className="text-ink-3">unnamed</em>}</span>
                          </span>
                        </Td>
                        <Td className="font-mono text-sm text-ink-2 whitespace-nowrap">{u.email || "—"}</Td>
                        <Td className="text-ink-2">
                          {(u.interests || []).length ? (u.interests || []).slice(0, 3).join(", ") : "—"}
                          {(u.interests || []).length > 3 && ` +${u.interests.length - 3}`}
                        </Td>
                        <Td className="text-ink-2 whitespace-nowrap">{when(u.created_at)}</Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}

            {section === "reports" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Reports <span className="font-mono text-xs text-ink-3">{openReports.length} open</span>
                </h2>
                <Result {...common} empty={!reports.length} emptyText="Nothing has been reported.">
                  <Table head={["Target", "Reason", "Reported by", "When", "Status"]}>
                    {reports.map((r) => (
                      <tr key={r.id} className={r.resolved ? "opacity-50" : undefined}>
                        <Td className="font-semibold max-w-xs"><span className="line-clamp-2">{r.target}</span></Td>
                        <Td className="text-ink-2 max-w-sm"><span className="line-clamp-2">{r.reason}</span></Td>
                        <Td className="text-ink-2 whitespace-nowrap">{userName(r.reporter_id)}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{when(r.created_at)}</Td>
                        <Td>
                          {r.resolved ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-bold text-success">
                              <Icon name="check" size={13} />Resolved
                            </span>
                          ) : (
                            <Button variant="outline" size="xs" onClick={() => resolveReport(r)} loading={busyId === r.id}>
                              Resolve
                            </Button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}

            {section === "tea" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Locali-Tea <span className="font-mono text-xs text-ink-3">{tea.length}</span>
                </h2>
                <p className="text-base text-ink-2 mb-5 max-w-prose leading-relaxed">
                  Authors are not shown, and cannot be: author_id is not selectable on this table by
                  anyone. You can remove content without learning who wrote it.
                </p>
                <Result {...common} empty={!tea.length} emptyText="Nothing posted.">
                  <Table head={["Post", "Kind", "True / Cap", "Replies", "Posted", ""]}>
                    {tea.map((t) => (
                      <tr key={t.id}>
                        <Td className="max-w-md"><span className="line-clamp-2">{t.text}</span></Td>
                        <Td className="text-ink-2 capitalize whitespace-nowrap">{t.category || "tea"}</Td>
                        <Td className="font-mono tabular-nums whitespace-nowrap">{fmt(t.true_count)} / {fmt(t.cap_count)}</Td>
                        <Td className="font-mono tabular-nums">{fmt(t.comment_count)}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{when(t.created_at)}</Td>
                        <Td><DangerButton label="Remove" onConfirm={() => delTea(t)} busy={busyId === t.id} /></Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}

            {section === "events" && (
              <>
                <h2 className="text-base font-bold text-ink pb-2.5 mb-4 border-b-2 border-ink">
                  Events <span className="font-mono text-xs text-ink-3">{events.length}</span>
                </h2>
                <Result {...common} empty={!events.length} emptyText="No events yet.">
                  <Table head={["Title", "Category", "When", "Where", "Capacity", ""]}>
                    {events.map((e) => (
                      <tr key={e.id}>
                        <Td className="font-semibold max-w-xs"><span className="line-clamp-2">{e.title}</span></Td>
                        <Td className="text-ink-2 whitespace-nowrap">{e.category}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{e.event_when}</Td>
                        <Td className="text-ink-2 whitespace-nowrap">{e.event_where}</Td>
                        <Td className="font-mono tabular-nums">{fmt(e.capacity)}</Td>
                        <Td><DangerButton onConfirm={() => delEvent(e)} busy={busyId === e.id} /></Td>
                      </tr>
                    ))}
                  </Table>
                </Result>
              </>
            )}
          </div>
        </div>
      </div>

      {creating && (
        <NewCommunity
          onClose={() => setCreating(false)}
          onCreated={async () => { setCreating(false); await load(); }}
          onToast={onToast}
        />
      )}
    </Screen>
  );
}

/* ------------------------------------------------------- New community */

function NewCommunity({ onClose, onCreated, onToast }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [desc, setDesc] = useState("");
  const [official, setOfficial] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const handle = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const { error } = await supabase.from("communities").insert({
      name: name.trim(),
      category,
      tags: [category],
      description: desc.trim() || "No description yet.",
      official,
      handle,
      member_count: 0,
      creator_label: "Orbit",
    });
    setBusy(false);
    if (error) { onToast?.(`Refused: ${error.message}`); return; }
    onToast?.("Community created");
    onCreated();
  };

  return (
    <Modal
      title="New community"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button tone="blue" size="md" onClick={submit} disabled={!name.trim()} loading={busy}>Create</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="ac-name" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Name</label>
          <Input id="ac-name" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Robotics Club MUJ" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name)}
                className={cx(
                  "h-8 px-3 rounded-full text-xs font-semibold transition-colors",
                  category === c.name ? "bg-solid text-solid-ink" : "bg-bg-sunken text-ink-2 hover:text-ink"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="ac-desc" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Description</label>
          <Textarea id="ac-desc" rows={3} maxLength={800} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is it for?" />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={official}
            onChange={(e) => setOfficial(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span className="text-base text-ink">Mark as an official club</span>
        </label>
      </div>
    </Modal>
  );
}
