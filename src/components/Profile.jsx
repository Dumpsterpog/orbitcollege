import { useState } from "react";
import { BadgeCheck, ShieldCheck, Users2, Grid3x3, Settings as SettingsIcon, Camera, Plus } from "lucide-react";
import { CATEGORIES } from "../data/constants.js";
import { Avatar, Button, Card, Input, Textarea, Field, Badge, SectionLabel, Separator, cx } from "./ui/Primitives.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { PageHeader, Screen } from "./ui/Layout.jsx";

// Profile, rebuilt as a dense two-column desktop page.
//
// The old version was an Instagram-style mobile profile — big centred avatar,
// a three-up stat row, a full-bleed tab strip and a 3-col image grid — which
// on a wide screen left an enormous empty right half. Identity now sits in a
// fixed-width left rail with the tabbed content beside it, and it degrades to
// a single stacked column below lg.
//
// The settings dropdown that used to live behind the gear here is gone:
// theme, account and sign-out moved to the real Settings screen, so there is
// exactly one place to change a setting instead of two that disagreed.

function Stat({ value, label }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-lg font-semibold text-content tabular-nums leading-none">{value}</p>
      <p className="text-2xs text-content-muted mt-1">{label}</p>
    </div>
  );
}

export function ProfileScreen({
  user, joinedCommunities, onSaveProfile, onVerifyGuest, onOpenSettings, onOpenCommunity, onComingSoon,
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftBio, setDraftBio] = useState(user.bio || "");
  const [tab, setTab] = useState("communities");

  const createdCommunities = joinedCommunities.filter((c) => c.creator === "You");
  const interests = user.interests || [];
  const bio = user.bio || "";

  const save = () => {
    if (!draftName.trim()) return;
    onSaveProfile(draftName.trim(), draftBio.trim());
    setEditing(false);
  };
  const startEdit = () => { setDraftName(user.name); setDraftBio(bio); setEditing(true); };

  const TABS = [
    { key: "communities", label: "Communities", icon: Users2, count: joinedCommunities.length },
    { key: "posts", label: "Posts", icon: Grid3x3 },
  ];

  return (
    <Screen>
      <PageHeader
        title="Profile"
        actions={
          <Button variant="ghost" size="sm" icon={SettingsIcon} onClick={onOpenSettings}>
            Settings
          </Button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-5 lg:px-8 py-6 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Identity rail */}
          <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-0 space-y-4">
            <div className="flex items-start gap-3.5">
              <Avatar name={user.name} size={56} />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold text-content truncate">{user.name}</h2>
                  {user.verified && <BadgeCheck size={15} className="text-accent shrink-0" />}
                </div>
                <p className="text-xs text-content-muted mt-0.5">
                  {user.verified ? "Verified member" : "Guest"}
                </p>
              </div>
            </div>

            {!user.verified && (
              <Card className="p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-accent mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-content-secondary leading-relaxed">
                      You're browsing as a guest. Sign in to join communities, post and chat.
                    </p>
                    <Button variant="secondary" size="sm" onClick={onVerifyGuest} className="mt-2.5">
                      Sign in
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-3.5 flex gap-2">
              <Stat value={joinedCommunities.length} label="Joined" />
              <Separator className="w-px h-auto self-stretch" />
              <Stat value={createdCommunities.length} label="Created" />
              <Separator className="w-px h-auto self-stretch" />
              <Stat value={interests.length} label="Interests" />
            </Card>

            {editing ? (
              <Card className="p-3.5 space-y-3">
                <Field label="Display name" htmlFor="pf-name">
                  <Input
                    id="pf-name" value={draftName} maxLength={60}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                    autoFocus
                  />
                </Field>
                <Field label="Bio" htmlFor="pf-bio" hint={`${draftBio.length}/160`}>
                  <Textarea
                    id="pf-bio" value={draftBio} rows={3} maxLength={160}
                    onChange={(e) => setDraftBio(e.target.value)}
                    placeholder="What are you into?"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={save} disabled={!draftName.trim()}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </Card>
            ) : (
              <>
                {bio
                  ? <p className="text-sm text-content-secondary leading-relaxed">{bio}</p>
                  : <p className="text-sm text-content-faint italic">No bio yet.</p>}

                {interests.length > 0 && (
                  <div className="space-y-2">
                    <SectionLabel>Interests</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((name) => {
                        const cat = CATEGORIES.find((x) => x.name === name);
                        const Icon = cat?.icon;
                        return (
                          <Badge key={name}>
                            {Icon && <Icon size={10} />}{name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button variant="secondary" size="md" onClick={startEdit} className="w-full">
                  Edit profile
                </Button>
              </>
            )}
          </div>

          {/* Content pane */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-0.5 border-b border-line mb-4">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cx(
                      "inline-flex items-center gap-1.5 px-3 h-9 -mb-px border-b-2 text-xs font-medium transition-colors",
                      active
                        ? "border-content text-content"
                        : "border-transparent text-content-muted hover:text-content"
                    )}
                  >
                    <t.icon size={13} />
                    {t.label}
                    {typeof t.count === "number" && (
                      <span className="text-content-faint tabular-nums">{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {tab === "communities" && (
              joinedCommunities.length === 0 ? (
                <EmptyState
                  icon={Users2}
                  title="No communities yet"
                  subtitle="Join a club or community from Explore and it'll show up here."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {joinedCommunities.map((c) => {
                    const cat = CATEGORIES.find((x) => x.name === c.category);
                    const Icon = cat?.icon;
                    return (
                      <Card
                        key={c.id}
                        as="button"
                        interactive
                        onClick={() => onOpenCommunity?.(c)}
                        className="p-3.5"
                      >
                        <div className="flex items-start gap-2.5">
                          {Icon && (
                            <span className="h-8 w-8 rounded shrink-0 grid place-items-center bg-surface-inset border border-line">
                              <Icon size={14} className="text-content-secondary" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-content truncate">{c.name}</p>
                            <p className="text-2xs text-content-muted mt-0.5 truncate">
                              {c.category}
                              {c.creator === "You" && " · you created this"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )
            )}

            {tab === "posts" && (
              <EmptyState
                icon={Camera}
                title="Profile posts aren't live yet"
                subtitle="Posting to your own profile is still being built. Posts you make inside a community already work and appear on that community's Posts tab."
                action={
                  <Button variant="secondary" size="sm" icon={Plus} onClick={onComingSoon}>
                    Notify me
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
