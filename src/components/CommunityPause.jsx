import { Icon } from "./ui/Primitives.jsx";

export const PAUSE_TITLE = "New communities are paused";
export const PAUSE_BODY =
  "You cannot create a community at the moment. The ones already here work as normal, so you can still join them, post and chat.";

export function CommunityPauseNotice({ className = "" }) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl bg-c-amber/10 ring-1 ring-c-amber/25 ${className}`}>
      <Icon name="info" size={18} className="text-c-amber shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink">{PAUSE_TITLE}</p>
        <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{PAUSE_BODY}</p>
      </div>
    </div>
  );
}
