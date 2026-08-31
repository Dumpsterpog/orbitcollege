import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, Input, Textarea, cx } from "./ui/Primitives.jsx";
import { Screen, Empty } from "./ui/Layout.jsx";

// Profile.
//
// Structure is the one every social product converged on because it works: a
// wide identity header, an inline count strip, then tabbed content. The
// counts live here rather than in Home's rail — this is the page you open to
// see your own numbers.
//
// The header uses a flat tinted band, not a photo and not a gradient. There
// is no cover-image field in the schema, and a decorative gradient is the
// thing that made the rest of the app look borrowed.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

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
      className={cx("grid place-items-center rounded-full shrink-0 ring-1 ring-line", MARK[cat?.tint] || MARK["text-c-blue"])}
      style={{ width: size, height: size }}
    >
      <Icon name={cat?.msr || "groups"} size={Math.round(size * 0.48)} className={cat?.tint} />
    </span>
  );
}

function Stat({ value, label, tint, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={cx("text-left", onClick && "hover:opacity-70 transition-opacity")}>
      <p className={cx("text-2xl font-bold tabular-nums leading-none", tint)}>{value}</p>
      <p className="text-xs font-medium text-ink-2 mt-1.5">{label}</p>
    </Tag>
  );
}

function CommunityCard({ c, onOpen, badge }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  return (
    <button onClick={() => onOpen(c)} className="card group p-4 flex items-center gap-3.5 text-left">
      <CommunityMark c={c} size={44} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-base font-bold text-ink truncate group-hover:opacity-70">
            {c.name.split(" — ")[0]}
          </span>
          {c.official && <Icon name="verified" size={15} className="text-c-blue shrink-0" />}
        </span>
        <span className="flex items-center gap-1.5 text-xs mt-1 min-w-0">
          <Icon name={cat?.msr || "groups"} size={13} className={cat?.tint} />
          <span className={cx("font-semibold truncate", cat?.tint)}>{c.category}</span>
          <span className="text-ink-3">·</span>
          <span className="text-ink-2 tabular-nums shrink-0">{compact(c.members)}</span>
        </span>
      </span>
      {badge && (
        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-c-amber/15 text-c-amber text-2xs font-bold shrink-0">
          <Icon name="star" size={12} />Owner
        </span>
      )}
    </button>
  );
}

export function ProfileScreen({
  user, joinedCommunities = [], onSaveProfile, onVerifyGuest, onOpenSettings,
  onOpenCommunity, onComingSoon,
  authUserId, myPosts = [], registeredEvents = [], allCommunities = [], onOpenEvent,
}) {
  const [tab, setTab] = useState("communities");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");

  const interests = user.interests || [];
  const owned = useMemo(
    () => (authUserId ? allCommunities.filter((c) => c.creatorId === authUserId) : []),
    [allCommunities, authUserId]
  );

  const TABS = [
    { key: "communities", label: "Communities", icon: "groups", n: joinedCommunities.length },
    { key: "posts", label: "Posts", icon: "article", n: myPosts.length },
    { key: "events", label: "Events", icon: "confirmation_number", n: registeredEvents.length },
  ];

  const save = () => {
    onSaveProfile?.({ name: draftName.trim() || user.name, bio: draftBio.trim() });
    setEditing(false);
  };

  // Guests see the page blurred behind a gate rather than an empty profile.
  // A profile with nothing in it doesn't explain why it's empty; showing the
  // real shape behind glass does, and the only way past it is signing in.
  const gated = !user.verified;

  return (
    <Screen className={gated ? "relative overflow-hidden" : undefined}>
      {gated && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-bg/40 backdrop-blur-md animate-fade-in">
          <div className="card max-w-sm w-full p-7 text-center shadow-pop animate-rise">
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
      {/* Identity band. Flat tint, no photo, no gradient — there's no cover
          field in the schema and a decorative one would be filler. */}
      <div className="bg-bg-sunken border-b border-line">
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 pt-10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <Avatar name={user.name} size={96} ring={user.verified} className="shrink-0" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold text-ink truncate">{user.name || "Guest"}</h1>
                {user.verified ? (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-c-green/15 text-c-green text-2xs font-bold">
                    <Icon name="check_circle" size={13} />Signed in
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-bg text-ink-2 text-2xs font-bold ring-1 ring-line">
                    Guest
                  </span>
                )}
              </div>

              {user.email && <p className="text-base text-ink-2 mt-1 truncate">{user.email}</p>}
              {user.bio && <p className="text-base text-ink mt-2.5 max-w-prose leading-relaxed">{user.bio}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {user.verified ? (
                <>
                  <Button variant="soft" size="md" icon="edit" iconTint="text-c-violet" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                  <Button variant="soft" size="md" icon="settings" iconTint="text-c-blue" onClick={onOpenSettings}>
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </>
              ) : (
                <Button tone="blue" size="md" onClick={onVerifyGuest}>Sign in</Button>
              )}
            </div>
          </div>

          {/* Counts. Inline strip — the profile idiom, and the reason they
              were taken off Home's rail. */}
          <div className="flex items-start gap-8 sm:gap-12 mt-7">
            <Stat value={joinedCommunities.length} label="Communities" tint="text-c-violet" onClick={() => setTab("communities")} />
            <Stat value={myPosts.length} label="Posts" tint="text-c-blue" onClick={() => setTab("posts")} />
            <Stat value={registeredEvents.length} label="Events" tint="text-c-orange" onClick={() => setTab("events")} />
            {owned.length > 0 && <Stat value={owned.length} label="Created" tint="text-c-amber" />}
          </div>

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6">
              {interests.map((name) => {
                const cat = CATEGORIES.find((x) => x.name === name);
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-bg text-xs font-semibold text-ink ring-1 ring-line"
                  >
                    <Icon name={cat?.msr || "interests"} size={14} className={cat?.tint} />
                    {name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs sit on the band's edge so the underline reads against the
            content below, not against the band. */}
        <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16">
          <div className="flex gap-1 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={cx(
                  "inline-flex items-center gap-2 px-4 h-11 border-b-2 text-base font-semibold transition-colors",
                  tab === t.key
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-2 hover:text-ink"
                )}
              >
                <Icon name={t.icon} size={18} className={tab === t.key ? "text-accent" : "text-ink-3"} />
                {t.label}
                <span className="text-xs tabular-nums text-ink-3">{t.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-5 sm:px-8 lg:px-12 xl:px-16 py-8">
        {tab === "communities" && (
          joinedCommunities.length === 0 && owned.length === 0 ? (
            <Empty
              icon="groups"
              tint="text-c-violet"
              title="No communities yet"
              body="Find clubs and communities in Explore, and they'll show up here."
            />
          ) : (
            <div className="space-y-8">
              {owned.length > 0 && (
                <section>
                  <h2 className="text-base font-bold text-ink mb-3">Created by you</h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {owned.map((c) => <CommunityCard key={c.id} c={c} onOpen={onOpenCommunity} badge />)}
                  </div>
                </section>
              )}
              {joinedCommunities.length > 0 && (
                <section>
                  <h2 className="text-base font-bold text-ink mb-3">Joined</h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {joinedCommunities.map((c) => <CommunityCard key={c.id} c={c} onOpen={onOpenCommunity} />)}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {tab === "posts" && (
          myPosts.length === 0 ? (
            <Empty
              icon="article"
              tint="text-c-blue"
              title="Nothing posted yet"
              body="Anything you post in a community shows up here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {myPosts.map((p) => {
                const c = allCommunities.find((x) => x.id === p.communityId);
                return (
                  <article key={p.id} className="card p-4">
                    <button onClick={() => c && onOpenCommunity(c)} className="flex items-center gap-2.5 w-full text-left">
                      <CommunityMark c={c} size={32} />
                      <span className="min-w-0 leading-tight">
                        <span className="block text-base font-semibold text-ink truncate hover:opacity-70">
                          {c?.name?.split(" — ")[0] || "Community"}
                        </span>
                        <span className="block text-xs text-ink-2">{p.time}</span>
                      </span>
                    </button>
                    {p.text && <p className="text-base text-ink mt-3 line-clamp-4 leading-relaxed">{p.text}</p>}
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-40 object-cover rounded mt-3 media" />
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-ink-2 mt-3">
                      <Icon name="local_fire_department" size={15} className="text-c-orange" />
                      <span className="font-semibold text-ink tabular-nums">{p.sparks || 0}</span> sparks
                    </p>
                  </article>
                );
              })}
            </div>
          )
        )}

        {tab === "events" && (
          registeredEvents.length === 0 ? (
            <Empty
              icon="confirmation_number"
              tint="text-c-orange"
              title="No events yet"
              body="Register for an event and it'll be listed here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {registeredEvents.map((e) => {
                const cat = CATEGORIES.find((x) => x.name === e.category);
                const [head, ...rest] = String(e.when || "").split(/[\s,]+/).filter(Boolean);
                return (
                  <button key={e.id} onClick={() => onOpenEvent?.(e)} className="card group p-4 flex gap-4 text-left">
                    <span className="w-11 shrink-0 text-center leading-none">
                      <span className={cx("block text-xl font-bold tabular-nums", cat?.tint || "text-c-orange")}>
                        {head || "TBA"}
                      </span>
                      <span className="block text-2xs font-semibold text-ink-2 uppercase mt-1 truncate">
                        {rest.slice(0, 1).join(" ")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-ink truncate group-hover:opacity-70">{e.title}</span>
                      <span className="flex items-center gap-1 text-xs text-ink-2 mt-1 min-w-0">
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

      {/* Edit */}
      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4 animate-fade-in" onClick={() => setEditing(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-bg-raised rounded-lg shadow-pop overflow-hidden animate-pop">
            <div className="h-12 px-4 flex items-center border-b border-line">
              <h2 className="text-base font-bold text-ink flex-1">Edit profile</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="pf-name" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Name</label>
                <Input id="pf-name" value={draftName} maxLength={60} onChange={(e) => setDraftName(e.target.value)} autoFocus />
              </div>
              <div>
                <label htmlFor="pf-bio" className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Bio</label>
                <Textarea id="pf-bio" rows={4} maxLength={300} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} placeholder="A line about you." />
                <p className="text-xs text-ink-3 mt-1 tabular-nums">{draftBio.length}/300</p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-line flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => setEditing(false)}>Cancel</Button>
              <Button tone="green" size="md" onClick={save} disabled={!draftName.trim()}>Save</Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Screen>
  );
}
