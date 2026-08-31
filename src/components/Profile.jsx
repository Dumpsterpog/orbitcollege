import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { EmptyState } from "./EmptyState.jsx";
import { Icon, Input, Textarea, Field, cx } from "./ui/Primitives.jsx";

// Profile, rebuilt to the Stitch profile.html mock: a 12-column grid with an
// identity column at 4 and a tabbed content column at 8.
//
// The mock's left column carries Skills and "Projects & Experience". Neither
// exists in this data model — `profiles` has name and bio and nothing else —
// so rather than invent fields the app can't save, those two cards are used
// for the real equivalents in the same shape: Interests (picked at sign-up,
// same pill treatment) and Communities You Run (creator-owned communities,
// same titled-entry-with-description treatment). The card that has no real
// counterpart is hidden rather than filled with placeholder text.

function Card({ className, children }) {
  return <div className={cx("bg-surface-container rounded-xl p-md shadow-sm", className)}>{children}</div>;
}

function StatBlock({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-headline-sm font-semibold text-primary tabular-nums">{value}</span>
      <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------ Activity */

function ActivityPost({ post, community, name, onOpen }) {
  return (
    <Card>
      <div className="flex items-start gap-sm mb-sm">
        <p className="text-label-md text-on-surface">
          {name}
          <span className="text-on-surface-variant font-normal text-xs ml-1">
            posted in {community?.name || "a community"} • {post.time}
          </span>
        </p>
      </div>
      {post.text && <p className="text-body-md text-on-surface">{post.text}</p>}
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="mt-sm w-full max-h-64 object-cover rounded-lg border border-outline-variant/20"
        />
      )}
      <div className="mt-sm flex gap-md">
        <span className="text-on-surface-variant flex items-center gap-xs text-label-sm">
          <Icon name="thumb_up" size={16} className="text-icon-blue" />
          <span className="tabular-nums">{post.sparks}</span>
        </span>
        <button
          onClick={() => community && onOpen(community)}
          className="text-on-surface-variant hover:text-primary flex items-center gap-xs text-label-sm transition-colors"
        >
          <Icon name="chat_bubble" size={16} className="text-icon-teal" />
          Open
        </button>
      </div>
    </Card>
  );
}

function ActivityRegistration({ event, name }) {
  return (
    <Card>
      <div className="flex items-start gap-sm mb-sm">
        <p className="text-label-md text-on-surface">
          {name}
          <span className="text-on-surface-variant font-normal text-xs ml-1">
            registered for {event.title}
          </span>
        </p>
      </div>
      <div className="border border-outline-variant/30 rounded-lg p-sm flex items-center gap-sm bg-surface-container-lowest">
        <span className="w-12 h-12 bg-primary-container/20 rounded grid place-items-center shrink-0">
          <Icon name="event" size={22} className="text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-label-md text-on-surface truncate">{event.title}</p>
          <p className="text-body-sm text-on-surface-variant truncate">{event.when}</p>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- Communities */

function CommunityTile({ c, onOpen }) {
  const cat = CATEGORIES.find((x) => x.name === c.category);
  return (
    <article className="bg-surface-container rounded-xl p-md shadow-sm hover:shadow-md transition-shadow group flex flex-col items-center text-center">
      <span className="w-20 h-20 rounded-full bg-secondary-container grid place-items-center shrink-0 mb-sm overflow-hidden">
        {c.avatarUrl
          ? <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
          : cat && <Icon name={cat.msr} size={36} className={cat.tint} />}
      </span>
      <h3 className="text-headline-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
        {c.name}
      </h3>
      <p className="text-body-sm text-on-surface-variant mt-xs">
        {c.category} • {c.members} members
      </p>
      <button
        onClick={() => onOpen(c)}
        className="mt-sm px-sm py-1 border border-outline rounded-full text-label-sm text-on-surface hover:bg-surface-container-high transition-colors"
      >
        View
      </button>
    </article>
  );
}

/* -------------------------------------------------------------- Events */

// The mock's date chip splits a date into day + month. Event `when` is a
// free-text string in this schema ("Fri 6 PM", "Oct 24 • 2:00 PM"), so there
// is nothing reliable to split — the chip shows a calendar glyph instead of
// parsing a format the data doesn't guarantee.
function EventRow({ e, onOpen }) {
  return (
    <div className="bg-surface-container rounded-xl overflow-hidden shadow-sm flex items-center p-md gap-md">
      <span className="w-16 h-16 bg-primary-container/10 rounded-lg grid place-items-center shrink-0 border border-primary/20">
        <Icon name="event" size={26} className="text-primary" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-label-sm text-on-surface-variant mb-xs">{e.when}</p>
        <h3 className="text-headline-sm font-semibold text-on-surface truncate">{e.title}</h3>
        <p className="text-body-sm text-on-surface-variant line-clamp-1">
          {e.where}{e.desc ? ` • ${e.desc}` : ""}
        </p>
      </div>
      <button
        onClick={() => onOpen?.(e)}
        aria-label="Open event"
        className="p-2 text-on-surface-variant hover:text-primary transition-colors shrink-0"
      >
        <Icon name="bookmark" size={22} className="text-icon-amber" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------- Screen */

const TABS = [
  { key: "activity", label: "Recent Activity" },
  { key: "communities", label: "Communities" },
  { key: "events", label: "My Events" },
];

export function ProfileScreen({
  user, joinedCommunities = [], onSaveProfile, onVerifyGuest, onOpenSettings,
  onOpenCommunity, onComingSoon,
  authUserId, myPosts = [], registeredEvents = [], allCommunities = [], onOpenEvent,
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");
  const [tab, setTab] = useState("activity");

  const bio = user.bio || "";
  const interests = user.interests || [];

  const startEdit = () => { setDraftName(user.name); setDraftBio(bio); setEditing(true); };
  const save = () => {
    if (!draftName.trim()) return;
    onSaveProfile(draftName.trim(), draftBio.trim());
    setEditing(false);
  };

  // Communities this user created — the real stand-in for the mock's
  // "Projects & Experience", same titled-entry shape.
  const owned = useMemo(
    () => (authUserId ? allCommunities.filter((c) => c.creatorId === authUserId) : []),
    [allCommunities, authUserId]
  );

  const activity = useMemo(() => {
    const posts = myPosts.map((p) => ({ kind: "post", key: `p-${p.id}`, post: p }));
    const regs = registeredEvents.map((e) => ({ kind: "event", key: `e-${e.id}`, event: e }));
    return [...posts, ...regs];
  }, [myPosts, registeredEvents]);

  if (!user.verified) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-surface">
        <div className="px-md lg:px-margin-desktop py-xl max-w-max-width mx-auto">
          <EmptyState
            title="Sign in to see your profile"
            subtitle="Your communities, events and activity live here once you have an account."
            action={
              <button
                onClick={onVerifyGuest}
                className="bg-primary text-on-primary text-label-md font-medium px-lg py-sm rounded-lg hover:bg-on-primary-fixed-variant transition-colors shadow-sm"
              >
                Sign in
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-surface">
      <div className="px-md lg:px-margin-desktop py-xl">
        <div className="max-w-max-width w-full mx-auto grid grid-cols-12 gap-gutter">

          {/* Identity column */}
          <section className="col-span-12 lg:col-span-4 space-y-md">
            <Card>
              <div className="flex flex-col items-center text-center space-y-md">
                <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-md bg-primary-container grid place-items-center shrink-0">
                  <span className="text-on-primary-container text-headline-xl font-bold">
                    {(user.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                </div>

                {editing ? (
                  <div className="w-full space-y-md text-left">
                    <Field label="Display name" htmlFor="pf-name">
                      <Input id="pf-name" value={draftName} maxLength={60} onChange={(e) => setDraftName(e.target.value)} />
                    </Field>
                    <Field label="Bio" htmlFor="pf-bio" hint="Optional">
                      <Textarea id="pf-bio" rows={3} maxLength={300} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} />
                    </Field>
                    <div className="flex gap-sm">
                      <button
                        onClick={save}
                        disabled={!draftName.trim()}
                        className="flex-1 py-sm bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-on-primary-fixed-variant transition-colors shadow-sm disabled:opacity-45"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="px-lg py-sm rounded-lg text-label-md font-medium text-on-surface-variant hover:bg-surface-container-high transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h1 className="text-headline-lg font-bold text-on-surface">{user.name}</h1>
                      <p className="text-body-md text-on-surface-variant mt-xs">
                        {interests.length > 0 ? `${interests.length} interests • Orbit member` : "Orbit member"}
                      </p>
                    </div>

                    {bio && <p className="text-body-sm text-on-surface text-balance">{bio}</p>}

                    <div className="flex w-full justify-around pt-sm">
                      <StatBlock value={joinedCommunities.length} label="Communities" />
                      <StatBlock value={registeredEvents.length} label="Events" />
                    </div>

                    <button
                      onClick={startEdit}
                      className="w-full py-sm bg-primary text-on-primary rounded-lg text-label-md font-medium hover:bg-on-primary-fixed-variant transition-colors shadow-sm"
                    >
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </Card>

            {/* Interests — the mock's Skills card, with the field this app has */}
            {interests.length > 0 && (
              <Card>
                <h2 className="text-headline-sm font-semibold text-on-surface mb-sm">Interests</h2>
                <div className="flex flex-wrap gap-xs">
                  {interests.map((name) => {
                    const cat = CATEGORIES.find((c) => c.name === name);
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-sm py-1 bg-surface-container-high text-on-surface rounded-full text-label-sm font-medium"
                      >
                        {cat && <Icon name={cat.msr} size={14} className={cat.tint} />}
                        {name}
                      </span>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Communities you run — the mock's Projects & Experience shape */}
            {owned.length > 0 && (
              <Card>
                <h2 className="text-headline-sm font-semibold text-on-surface mb-sm">Communities You Run</h2>
                <div className="space-y-sm">
                  {owned.map((c) => (
                    <div key={c.id} className="border-b border-outline-variant/30 pb-sm last:border-0 last:pb-0">
                      <button onClick={() => onOpenCommunity(c)} className="text-left w-full group">
                        <h3 className="text-label-md text-on-surface font-bold group-hover:text-primary transition-colors">
                          {c.name}
                        </h3>
                        <p className="text-body-sm text-on-surface-variant">
                          {c.category} • {c.members} members
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <button
              onClick={onOpenSettings}
              className="w-full flex items-center justify-center gap-xs py-sm rounded-lg text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <Icon name="settings" size={18} className="text-icon-violet" />
              Settings
            </button>
          </section>

          {/* Tabbed content */}
          <section className="col-span-12 lg:col-span-8 flex flex-col space-y-lg">
            <nav className="flex gap-sm bg-surface-container-low rounded-xl px-lg py-sm shadow-sm overflow-x-auto no-scrollbar">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={cx(
                    "text-label-md font-medium px-md py-xs rounded-full transition-colors whitespace-nowrap",
                    tab === t.key
                      ? "text-primary bg-primary/10"
                      : "text-on-surface-variant hover:text-primary hover:bg-primary/5"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="space-y-md">
              {tab === "activity" && (
                activity.length === 0 ? (
                  <EmptyState
                    title="No activity yet"
                    subtitle="Posts you write and events you register for will show up here."
                    compact
                  />
                ) : (
                  activity.map((item) =>
                    item.kind === "post" ? (
                      <ActivityPost
                        key={item.key}
                        post={item.post}
                        name={user.name}
                        community={allCommunities.find((c) => c.id === item.post.communityId)}
                        onOpen={onOpenCommunity}
                      />
                    ) : (
                      <ActivityRegistration key={item.key} event={item.event} name={user.name} />
                    )
                  )
                )
              )}

              {tab === "communities" && (
                joinedCommunities.length === 0 ? (
                  <EmptyState
                    title="You haven't joined anything yet"
                    subtitle="Find clubs and communities in Explore."
                    compact
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                    {joinedCommunities.map((c) => (
                      <CommunityTile key={c.id} c={c} onOpen={onOpenCommunity} />
                    ))}
                  </div>
                )
              )}

              {tab === "events" && (
                registeredEvents.length === 0 ? (
                  <EmptyState
                    title="No events yet"
                    subtitle="Events you register for from the Events page will be listed here."
                    compact
                  />
                ) : (
                  registeredEvents.map((e) => <EventRow key={e.id} e={e} onOpen={onOpenEvent} />)
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
