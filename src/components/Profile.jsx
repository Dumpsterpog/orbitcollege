import { useState, useMemo } from "react";
import { CATEGORIES } from "../data/constants.js";
import { Icon, Avatar, Button, Input, Textarea, Field, cx } from "./ui/Primitives.jsx";
import { Screen, Column, Empty, Modal } from "./ui/Layout.jsx";

// Profile — the reference's header layout: avatar left, everything else in a
// column to the right, and the counts as an inline row of numerals with no
// container. Same idea as Home's metric strip: the number carries the
// weight, the label stays quiet, nothing is boxed.
//
// Tabs are a centred row of uppercase labels with a top rule on the active
// one, which is how the reference marks them — no pill, no underline sweep.

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

function Stat({ value, label, tint }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cx("text-lg font-bold tabular-nums", tint)}>{compact(value)}</span>
      <span className="text-base text-ink-2">{label}</span>
    </span>
  );
}

const TABS = [
  { key: "posts", label: "Posts", icon: "grid_on" },
  { key: "communities", label: "Communities", icon: "groups" },
  { key: "events", label: "Events", icon: "confirmation_number" },
];

export function ProfileScreen({
  user, joinedCommunities = [], onSaveProfile, onVerifyGuest, onOpenSettings,
  onOpenCommunity, onComingSoon,
  authUserId, myPosts = [], registeredEvents = [], allCommunities = [], onOpenEvent,
}) {
  const [tab, setTab] = useState("posts");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");

  const interests = user.interests || [];
  const owned = useMemo(
    () => (authUserId ? allCommunities.filter((c) => c.creatorId === authUserId) : []),
    [allCommunities, authUserId]
  );

  const save = () => {
    if (!draftName.trim()) return;
    onSaveProfile(draftName.trim(), draftBio.trim());
    setEditing(false);
  };

  if (!user.verified) {
    return (
      <Screen>
        <Empty
          icon="account_circle"
          title="Sign in to see your profile"
          body="Your communities, events and posts live here once you have an account."
          action={<Button variant="primary" size="lg" onClick={onVerifyGuest}>Sign in</Button>}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Column className="max-w-3xl pt-8 pb-16">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-12 pb-8">
          <Avatar name={user.name} size={128} ring className="shrink-0" />

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <h1 className="text-xl font-normal text-ink truncate">{user.name}</h1>
              <div className="flex items-center justify-center gap-2">
                <Button variant="soft" size="sm" onClick={() => { setDraftName(user.name); setDraftBio(user.bio || ""); setEditing(true); }}>
                  Edit profile
                </Button>
                <Button variant="soft" size="sm" onClick={onOpenSettings}>Settings</Button>
              </div>
            </div>

            {/* the inline stat row — no cards */}
            <div className="flex items-center justify-center sm:justify-start gap-7 mt-5">
              <Stat value={myPosts.length} label="posts" tint="text-c-blue" />
              <Stat value={joinedCommunities.length} label="communities" tint="text-c-violet" />
              <Stat value={registeredEvents.length} label="events" tint="text-c-orange" />
            </div>

            {user.bio && <p className="text-base text-ink mt-5 leading-normal whitespace-pre-wrap">{user.bio}</p>}

            {interests.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-4">
                {interests.map((n) => {
                  const c = CATEGORIES.find((x) => x.name === n);
                  return (
                    <span key={n} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                      {c && <Icon name={c.msr} size={15} className={c.tint} />}
                      {n}
                    </span>
                  );
                })}
              </div>
            )}

            {owned.length > 0 && (
              <p className="text-xs text-ink-2 mt-4">
                Runs{" "}
                {owned.map((c, i) => (
                  <span key={c.id}>
                    <button onClick={() => onOpenCommunity(c)} className="font-semibold text-accent hover:opacity-70">
                      {c.name.split(" — ")[0]}
                    </button>
                    {i < owned.length - 1 && ", "}
                  </span>
                ))}
              </p>
            )}
          </div>
        </header>

        {/* Tabs */}
        <nav className="flex items-center justify-center gap-12 border-t border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={cx(
                "inline-flex items-center gap-1.5 -mt-px pt-4 pb-3 border-t-2 text-2xs font-semibold uppercase tracking-wider transition-colors",
                tab === t.key ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
              )}
            >
              <Icon name={t.icon} size={14} className={tab === t.key ? "text-ink" : "text-ink-3"} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="pt-6">
          {tab === "posts" && (
            myPosts.length === 0 ? (
              <Empty icon="photo_camera" title="No posts yet" body="Posts you write in your communities will show up here." />
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {myPosts.map((p) => {
                  const c = allCommunities.find((x) => x.id === p.communityId);
                  const cat = c && CATEGORIES.find((x) => x.name === c.category);
                  return (
                    <button
                      key={p.id}
                      onClick={() => c && onOpenCommunity(c)}
                      className="group relative aspect-square overflow-hidden bg-bg-sunken"
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full grid place-items-center p-3">
                          <span className="text-xs text-ink-2 line-clamp-4 text-left">{p.text}</span>
                        </span>
                      )}
                      <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                        <span className="inline-flex items-center gap-1.5 text-white text-base font-semibold">
                          <Icon name="favorite" size={18} />{p.sparks}
                        </span>
                      </span>
                      {cat && !p.imageUrl && (
                        <span className="absolute top-2 left-2">
                          <Icon name={cat.msr} size={16} className={cat.tint} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          {tab === "communities" && (
            joinedCommunities.length === 0 ? (
              <Empty icon="groups" title="Nothing joined yet" body="Find clubs and communities in Explore." />
            ) : (
              <div>
                {joinedCommunities.map((c) => {
                  const cat = CATEGORIES.find((x) => x.name === c.category);
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-3 border-b border-line last:border-0">
                      <button onClick={() => onOpenCommunity(c)} className="shrink-0">
                        {c.avatarUrl ? (
                          <Avatar src={c.avatarUrl} name={c.name} size={44} />
                        ) : (
                          <span className="grid place-items-center w-11 h-11 rounded-full bg-bg-sunken ring-1 ring-line">
                            <Icon name={cat?.msr || "groups"} size={22} className={cat?.tint} />
                          </span>
                        )}
                      </button>
                      <button onClick={() => onOpenCommunity(c)} className="min-w-0 flex-1 text-left leading-tight">
                        <span className="block text-base font-semibold text-ink truncate hover:opacity-70">{c.name}</span>
                        <span className="block text-xs text-ink-2 truncate">
                          {c.category} · {compact(c.members)} members
                        </span>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => onOpenCommunity(c)}>Open</Button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === "events" && (
            registeredEvents.length === 0 ? (
              <Empty icon="confirmation_number" title="No events yet" body="Events you register for will be listed here." />
            ) : (
              <div>
                {registeredEvents.map((e) => {
                  const cat = CATEGORIES.find((x) => x.name === e.category);
                  return (
                    <div key={e.id} className="flex items-center gap-3 py-3 border-b border-line last:border-0">
                      <span className="grid place-items-center w-11 h-11 rounded-full bg-bg-sunken ring-1 ring-line shrink-0">
                        <Icon name={cat?.msr || "confirmation_number"} size={22} className={cat?.tint || "text-c-orange"} />
                      </span>
                      <button onClick={() => onOpenEvent?.(e)} className="min-w-0 flex-1 text-left leading-tight">
                        <span className="block text-base font-semibold text-ink truncate hover:opacity-70">{e.title}</span>
                        <span className="block text-xs text-ink-2 truncate">{e.when} · {e.where}</span>
                      </button>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-c-green shrink-0">
                        <Icon name="check_circle" size={16} />Going
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </Column>

      {editing && (
        <Modal
          title="Edit profile"
          onClose={() => setEditing(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={!draftName.trim()}>Save</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Name" htmlFor="pf-name">
              <Input id="pf-name" value={draftName} maxLength={60} onChange={(e) => setDraftName(e.target.value)} />
            </Field>
            <Field label="Bio" htmlFor="pf-bio" hint={`${draftBio.length}/300`}>
              <Textarea id="pf-bio" rows={4} maxLength={300} value={draftBio} onChange={(e) => setDraftBio(e.target.value)} />
            </Field>
          </div>
        </Modal>
      )}
    </Screen>
  );
}
