import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, Input, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Empty } from "./ui/Layout.jsx";

// Profile.
//
// The same card language as Home and Locali-Tea: an identity card with a cover
// band and the counts, then tabbed content beside a rail of account details.
// The earlier version was a flat grey band running the full width of the
// screen with the numbers as bare text, which read as a settings page rather
// than as a person.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n || 0}`);
const card = "w-full bg-bg-raised rounded-2xl border border-line";

const MARK = {
  "text-c-blue": "bg-c-blue/10", "text-c-violet": "bg-c-violet/10",
  "text-c-pink": "bg-c-pink/10", "text-c-orange": "bg-c-orange/10",
  "text-c-amber": "bg-c-amber/10", "text-c-green": "bg-c-green/10",
  "text-c-teal": "bg-c-teal/10", "text-c-red": "bg-c-red/10",
};

function CommunityMark({ c, size = 44 }) {
  const cat = CATEGORIES.find((x) => x.name === c?.category);
  if (c?.avatarUrl) return <Avatar src={c.avatarUrl} name={c.name} size={size} />;
  return (
    <span
      className={cx("grid place-items-center rounded-xl shrink-0", MARK[cat?.tint] || MARK["text-c-blue"])}
      style={{ width: size, height: size }}
    >
      <Icon name={cat?.msr || "groups"} size={Math.round(size * 0.46)} className={cat?.tint || "text-c-blue"} />
    </span>
  );
}

function StatTile({ icon, tint, value, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cx(
        "flex items-center gap-3 rounded-xl p-3 text-left transition-colors min-w-0",
        active ? "bg-accent-wash ring-1 ring-accent/25" : "bg-bg-sunken",
        onClick ? "hover:ring-1 hover:ring-line-strong" : "cursor-default"
      )}
    >
      <span className="grid place-items-center w-9 h-9 rounded-lg bg-bg-raised shrink-0">
        <Icon name={icon} size={18} className={tint} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-ink tabular-nums leading-none">{value}</span>
        <span className="block text-xs font-medium text-ink-2 mt-1 truncate">{label}</span>
      </span>
    </button>
  );
}

function CommunityCard({ c, onOpen, owner }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  return (
    <button onClick={() => onOpen(c)} className={cx(card, "group p-4 flex items-center gap-3.5 text-left hover:border-line-strong transition-colors")}>
      <CommunityMark c={c} size={46} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[15px] font-bold text-ink truncate group-hover:text-accent transition-colors">
            {c.name.split(" — ")[0]}
          </span>
          {c.official && <Icon name="verified" size={15} className="text-c-blue shrink-0" />}
        </span>
        <span className="flex items-center gap-1.5 text-xs mt-1 min-w-0 text-ink-2">
          <span className={cx("font-semibold truncate", cat?.tint)}>{c.category}</span>
          <span className="text-ink-3">·</span>
          <span className="tabular-nums shrink-0">{compact(c.members)} members</span>
        </span>
      </span>
      {owner ? (
        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-c-amber/15 text-c-amber text-2xs font-bold shrink-0">
          <Icon name="star" size={12} />Owner
        </span>
      ) : (
        <Icon name="chevron_right" size={18} className="text-ink-3 shrink-0" />
      )}
    </button>
  );
}

function SectionTitle({ children, n }) {
  return (
    <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-3 px-1">
      {children}
      {n != null && <span className="tabular-nums">{n}</span>}
    </h2>
  );
}

function RailCard({ icon, tint, title, action, onAction, children }) {
  return (
    <section className={cx(card, "p-4")}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name={icon} size={18} className={tint} />
          <h3 className="text-[14px] font-bold text-ink tracking-tight truncate">{title}</h3>
        </div>
        {action && (
          <button onClick={onAction} className="text-[12px] font-semibold text-accent hover:underline shrink-0">{action}</button>
        )}
      </div>
      {children}
    </section>
  );
}

function InterestChip({ name, on, onClick }) {
  const cat = CATEGORIES.find((x) => x.name === name);
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      aria-pressed={onClick ? on : undefined}
      className={cx(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-colors",
        on === false
          ? "bg-transparent text-ink-2 ring-1 ring-line hover:text-ink hover:ring-line-strong"
          : "bg-bg-sunken text-ink ring-1 ring-line",
        on && onClick && "bg-accent-wash text-accent ring-accent/30"
      )}
    >
      <Icon name={cat?.msr || "interests"} size={14} className={on && onClick ? "text-accent" : cat?.tint} />
      {name}
    </Tag>
  );
}

export function ProfileScreen({
  user, email, joinedCommunities = [], onSaveProfile, onVerifyGuest, onOpenSettings,
  onOpenCommunity, authUserId, myPosts = [], registeredEvents = [], allCommunities = [],
  onOpenEvent, pendingCount = 0,
}) {
  const [tab, setTab] = useState("communities");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");
  const [draftInterests, setDraftInterests] = useState(user.interests || []);

  const interests = user.interests || [];
  const owned = useMemo(
    () => (authUserId ? allCommunities.filter((c) => c.creatorId === authUserId) : []),
    [allCommunities, authUserId]
  );
  // Owned communities are listed once, under their own heading, not twice.
  const joinedOnly = joinedCommunities.filter((c) => !owned.some((o) => o.id === c.id));

  const TABS = [
    { key: "communities", label: "Communities", icon: "groups", n: joinedCommunities.length },
    { key: "posts", label: "Posts", icon: "article", n: myPosts.length },
    { key: "events", label: "Events", icon: "confirmation_number", n: registeredEvents.length },
  ];

  const openEdit = () => {
    setDraftName(user.name);
    setDraftBio(user.bio || "");
    setDraftInterests(user.interests || []);
    setEditing(true);
  };

  const save = () => {
    onSaveProfile?.({ name: draftName.trim() || user.name, bio: draftBio.trim(), interests: draftInterests });
    setEditing(false);
  };

  const toggleInterest = (name) =>
    setDraftInterests((xs) => (xs.includes(name) ? xs.filter((x) => x !== name) : [...xs, name]));

  // Guests see the page blurred behind a gate rather than an empty profile.
  // A profile with nothing in it doesn't explain why it's empty; showing the
  // real shape behind glass does, and the only way past it is signing in.
  const gated = !user.verified;

  return (
    <Screen className={gated ? "relative overflow-hidden" : undefined}>
      {gated && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-bg/40 backdrop-blur-md animate-fade-in">
          <div className="card max-w-sm w-full p-7 text-center shadow-pop animate-rise rounded-2xl">
            <span className="grid place-items-center w-14 h-14 rounded-full bg-bg-sunken mx-auto mb-4">
              <Icon name="lock" size={28} className="text-c-violet" />
            </span>
            <h2 className="text-xl font-bold text-ink">Sign in to see your profile</h2>
            <p className="text-base text-ink-2 mt-2 leading-relaxed">
              Your communities, posts and registered events live here once you have an account.
            </p>
            <Button tone="blue" size="lg" onClick={onVerifyGuest} className="w-full mt-6">
              Sign in
            </Button>
            <p className="text-xs text-ink-3 mt-3">Takes a few seconds with Google.</p>
          </div>
        </div>
      )}

      <div className={cx(gated && "pointer-events-none select-none blur-[6px] opacity-60")} aria-hidden={gated}>
        <div className="w-full max-w-[1180px] mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">

          {/* ------------------------------------------------ identity */}
          <section className={cx(card, "overflow-hidden")}>
            <div className="relative h-28 sm:h-40 bg-gradient-to-br from-accent via-c-violet to-c-pink">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 18% 30%, rgba(255,255,255,0.55) 0, transparent 38%)," +
                    "radial-gradient(circle at 82% 75%, rgba(255,255,255,0.35) 0, transparent 42%)",
                }}
              />
            </div>

            <div className="px-4 sm:px-6 pb-5">
              <div className="flex items-end justify-between gap-3 -mt-12 sm:-mt-14">
                {/* relative z-10: the cover above is positioned, so without its
                    own stacking the avatar pulled up over it is painted under it. */}
                <span className="relative z-10 rounded-full ring-4 ring-bg-raised bg-bg-raised shrink-0">
                  <Avatar name={user.name || "Guest"} size={96} />
                </span>
                <div className="flex items-center gap-2 pb-1">
                  {user.verified ? (
                    <>
                      <Button variant="soft" size="md" icon="edit" iconTint="text-c-violet" onClick={openEdit}>
                        Edit profile
                      </Button>
                      <Button variant="soft" size="md" icon="settings" iconTint="text-c-blue" onClick={onOpenSettings} aria-label="Settings">
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    </>
                  ) : (
                    <Button tone="blue" size="md" onClick={onVerifyGuest}>Sign in</Button>
                  )}
                </div>
              </div>

              <div className="mt-3 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-ink break-words">{user.name || "Guest"}</h1>
                  {user.suspended ? (
                    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-c-red/15 text-c-red text-2xs font-bold">
                      <Icon name="block" size={13} />Suspended
                    </span>
                  ) : user.verified ? (
                    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-c-green/15 text-c-green text-2xs font-bold">
                      <Icon name="check_circle" size={13} />Verified student
                    </span>
                  ) : (
                    <span className="inline-flex items-center h-6 px-2 rounded-full bg-bg-sunken text-ink-2 text-2xs font-bold ring-1 ring-line">
                      Guest
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-ink-2 min-w-0">
                  {email && (
                    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                      <Icon name="mail" size={15} className="text-ink-3 shrink-0" />
                      <span className="truncate">{email}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="school" size={15} className="text-ink-3 shrink-0" />
                    Manipal University Jaipur
                  </span>
                </div>

                {user.bio ? (
                  <p className="text-[15px] text-ink mt-3 max-w-prose leading-relaxed whitespace-pre-wrap break-words">{user.bio}</p>
                ) : user.verified ? (
                  <button onClick={openEdit} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                    <Icon name="add" size={15} />Add a bio
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-5">
                <StatTile icon="groups" tint="text-c-violet" value={joinedCommunities.length} label="Communities"
                  active={tab === "communities"} onClick={() => setTab("communities")} />
                <StatTile icon="article" tint="text-c-blue" value={myPosts.length} label="Posts"
                  active={tab === "posts"} onClick={() => setTab("posts")} />
                <StatTile icon="confirmation_number" tint="text-c-orange" value={registeredEvents.length} label="Events"
                  active={tab === "events"} onClick={() => setTab("events")} />
                <StatTile icon="star" tint="text-c-amber" value={owned.length} label="Created" />
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* ---------------------------------------------- content */}
            <div className="min-w-0 flex flex-col gap-3 sm:gap-4">
              <div className="inline-flex items-center gap-1 bg-bg-sunken p-1 rounded-full max-w-full overflow-x-auto no-scrollbar self-start">
                {TABS.map((t) => {
                  const on = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      aria-pressed={on}
                      className={cx(
                        "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-all",
                        on ? "bg-accent text-accent-ink font-semibold" : "text-ink-2 hover:text-ink font-medium"
                      )}
                    >
                      <Icon name={t.icon} size={15} />
                      {t.label}
                      <span className={cx("tabular-nums text-xs", on ? "opacity-80" : "text-ink-3")}>{t.n}</span>
                    </button>
                  );
                })}
              </div>

              {tab === "communities" && (
                joinedCommunities.length === 0 && owned.length === 0 ? (
                  <div className={cx(card, "py-2")}>
                    <Empty icon="groups" tint="text-c-violet" title="No communities yet"
                      body="Find clubs and communities in Explore, and they'll show up here." />
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {owned.length > 0 && (
                      <section className="flex flex-col gap-2.5">
                        <SectionTitle n={owned.length}>Created by you</SectionTitle>
                        <div className="grid gap-3 md:grid-cols-2">
                          {owned.map((c) => <CommunityCard key={c.id} c={c} onOpen={onOpenCommunity} owner />)}
                        </div>
                      </section>
                    )}
                    {joinedOnly.length > 0 && (
                      <section className="flex flex-col gap-2.5">
                        <SectionTitle n={joinedOnly.length}>Joined</SectionTitle>
                        <div className="grid gap-3 md:grid-cols-2">
                          {joinedOnly.map((c) => <CommunityCard key={c.id} c={c} onOpen={onOpenCommunity} />)}
                        </div>
                      </section>
                    )}
                  </div>
                )
              )}

              {tab === "posts" && (
                myPosts.length === 0 ? (
                  <div className={cx(card, "py-2")}>
                    <Empty icon="article" tint="text-c-blue" title="Nothing posted yet"
                      body="Anything you post on campus or in a community shows up here." />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myPosts.map((p) => {
                      const c = allCommunities.find((x) => x.id === p.communityId);
                      return (
                        <article key={p.id} className={cx(card, "p-4 sm:p-5")}>
                          <button
                            onClick={() => c && onOpenCommunity(c)}
                            disabled={!c}
                            className="flex items-center gap-2.5 w-full text-left disabled:cursor-default"
                          >
                            {c ? <CommunityMark c={c} size={34} /> : (
                              <span className="grid place-items-center w-[34px] h-[34px] rounded-xl bg-c-blue/10 shrink-0">
                                <Icon name="public" size={16} className="text-c-blue" />
                              </span>
                            )}
                            <span className="min-w-0 leading-tight">
                              <span className="block text-[14px] font-semibold text-ink truncate">
                                {c?.name?.split(" — ")[0] || "Everyone on campus"}
                              </span>
                              <span className="block text-xs text-ink-3">{p.time}</span>
                            </span>
                          </button>
                          {p.text && (
                            <p className="text-[15px] text-ink mt-3 line-clamp-5 leading-relaxed whitespace-pre-wrap break-words">{p.text}</p>
                          )}
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt="" loading="lazy" className="w-full max-h-80 object-cover rounded-xl mt-3 border border-line" />
                          )}
                          <div className="flex items-center gap-4 text-xs text-ink-2 mt-3 pt-3 border-t border-line">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="favorite" size={15} className="text-c-pink" />
                              <span className="font-semibold text-ink tabular-nums">{p.sparks || 0}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="mode_comment" size={15} className="text-c-blue" />
                              <span className="font-semibold text-ink tabular-nums">{p.comments || 0}</span>
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              )}

              {tab === "events" && (
                registeredEvents.length === 0 ? (
                  <div className={cx(card, "py-2")}>
                    <Empty icon="confirmation_number" tint="text-c-orange" title="No events yet"
                      body="Register for an event and it'll be listed here." />
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {registeredEvents.map((e) => {
                      const d = e.startsAt instanceof Date ? e.startsAt : null;
                      return (
                        <button key={e.id} onClick={() => onOpenEvent?.(e)}
                          className={cx(card, "group p-4 flex gap-4 text-left hover:border-line-strong transition-colors")}>
                          <span className="w-14 shrink-0 rounded-xl bg-accent-wash text-center py-2 leading-none">
                            <span className="block text-2xs font-bold uppercase text-accent">
                              {d ? d.toLocaleDateString(undefined, { month: "short" }) : "TBA"}
                            </span>
                            <span className="block text-xl font-bold text-ink tabular-nums mt-1">{d ? d.getDate() : "—"}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold text-ink truncate group-hover:text-accent transition-colors">{e.title}</span>
                            <span className="block text-xs text-ink-2 mt-1 truncate">{e.when}</span>
                            <span className="flex items-center gap-1 text-xs text-ink-2 mt-0.5 min-w-0">
                              <Icon name="location_on" size={13} className="text-c-pink shrink-0" />
                              <span className="truncate">{e.where}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 h-6 px-2 mt-2 rounded-full bg-c-green/15 text-c-green text-2xs font-bold">
                              <Icon name="check" size={12} />Going
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* ------------------------------------------------- rail */}
            <aside className="h-full">
              <div className="lg:sticky lg:top-6 flex flex-col gap-4">
                {user.suspended && (
                  <section className={cx(card, "p-4 flex items-start gap-3")}>
                    <Icon name="block" size={18} className="text-c-red mt-0.5 shrink-0" />
                    <p className="text-xs text-ink-2 leading-relaxed">
                      <span className="block text-[14px] font-semibold text-ink mb-0.5">Your account is suspended</span>
                      You can still read Orbit, but posting, commenting and chat are off. Email team.orbit@gmail.com if this is a mistake.
                    </p>
                  </section>
                )}

                {pendingCount > 0 && (
                  <section className={cx(card, "p-4 flex items-start gap-3")}>
                    <Icon name="schedule" size={18} className="text-c-amber mt-0.5 shrink-0" />
                    <p className="text-xs text-ink-2 leading-relaxed">
                      <span className="block text-[14px] font-semibold text-ink mb-0.5">
                        {pendingCount === 1 ? "1 post" : `${pendingCount} posts`} waiting for review
                      </span>
                      A moderator checks it before it appears. Only you can see this.
                    </p>
                  </section>
                )}

                <RailCard icon="interests" tint="text-c-pink" title="Interests"
                  action={user.verified ? "Edit" : null} onAction={openEdit}>
                  {interests.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((name) => <InterestChip key={name} name={name} />)}
                    </div>
                  ) : (
                    <p className="text-xs text-ink-2 leading-relaxed">
                      Pick a few and Orbit suggests communities and events that match.
                    </p>
                  )}
                </RailCard>

                <RailCard icon="person" tint="text-c-blue" title="Account">
                  <div className="flex flex-col divide-y divide-line">
                    <div className="flex items-center gap-3 py-2.5 first:pt-0">
                      <Icon name="mail" size={16} className="text-ink-3 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-2xs font-semibold uppercase tracking-wide text-ink-3">Signed in with Google</span>
                        <span className="block text-[13px] text-ink truncate">{email || "Not signed in"}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 py-2.5">
                      <Icon name="school" size={16} className="text-ink-3 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-2xs font-semibold uppercase tracking-wide text-ink-3">Campus</span>
                        <span className="block text-[13px] text-ink">Manipal University Jaipur</span>
                      </span>
                    </div>
                    <button onClick={onOpenSettings} className="flex items-center gap-3 py-2.5 pb-0 text-left group">
                      <Icon name="settings" size={16} className="text-ink-3 shrink-0" />
                      <span className="flex-1 text-[13px] font-semibold text-ink group-hover:text-accent transition-colors">
                        Theme and notifications
                      </span>
                      <Icon name="chevron_right" size={16} className="text-ink-3" />
                    </button>
                  </div>
                </RailCard>
              </div>
            </aside>
          </div>
        </div>

        {/* ---------------------------------------------------- edit */}
        {editing && (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in"
               onClick={() => setEditing(false)}>
            <div onClick={(e) => e.stopPropagation()}
                 className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col bg-bg-raised rounded-t-2xl sm:rounded-2xl shadow-pop overflow-hidden animate-pop">
              <div className="h-14 px-5 flex items-center border-b border-line shrink-0">
                <h2 className="text-base font-bold text-ink flex-1">Edit profile</h2>
                <button onClick={() => setEditing(false)} aria-label="Close"
                        className="grid place-items-center w-8 h-8 rounded-full text-ink-3 hover:text-ink hover:bg-bg-sunken">
                  <Icon name="close" size={18} />
                </button>
              </div>
              <div className="p-5 space-y-5 overflow-y-auto">
                <div>
                  <label htmlFor="pf-name" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Name</label>
                  <Input id="pf-name" value={draftName} maxLength={60} onChange={(e) => setDraftName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label htmlFor="pf-bio" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Bio</label>
                  <Textarea id="pf-bio" rows={3} maxLength={300} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} placeholder="A line about you." />
                  <p className="text-xs text-ink-3 mt-1 tabular-nums text-right">{draftBio.length}/300</p>
                </div>
                <div>
                  <p className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <InterestChip key={c.name} name={c.name} on={draftInterests.includes(c.name)} onClick={() => toggleInterest(c.name)} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-line flex justify-end gap-2 shrink-0">
                <Button variant="ghost" size="md" onClick={() => setEditing(false)}>Cancel</Button>
                <Button tone="blue" size="md" onClick={save} disabled={!draftName.trim()}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
