import { useState } from "react";
import { Star, X } from "lucide-react";

// Shown right before the app exits (Android hardware back button at the
// root screen — see the backButton listener in App.jsx). Entirely optional:
// "Skip" and the backdrop both just close it and let the exit continue.
// Submitting writes to the real `app_reviews` table in Supabase.
export function ReviewPrompt({ onSubmit, onSkip }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating && !feedback.trim()) { onSkip(); return; }
    setSubmitting(true);
    await onSubmit({ rating: rating || null, feedback: feedback.trim() || null });
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 bg-black/70 z-[80] flex items-end" onClick={onSkip}>
      <div className="bg-white dark:bg-zinc-950 w-full rounded-t-3xl border-t border-zinc-200 dark:border-zinc-800 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <p className="font-bold text-zinc-900 dark:text-zinc-50">Before you go — how's it going?</p>
          <button onClick={onSkip} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 shrink-0"><X size={18} className="text-zinc-600 dark:text-zinc-400" /></button>
        </div>
        <div className="px-5 pb-6">
          <p className="text-xs text-zinc-500 mb-4">This is a beta — your review helps us fix things. Totally optional.</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                className="active:scale-90 transition-transform"
              >
                <Star size={30} className={(hoverRating || rating) >= n ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-700"} fill={(hoverRating || rating) >= n ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="Anything broken, confusing, or that you'd want added? (optional)"
            rows={3}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900 dark:focus:border-zinc-50 resize-none mb-4"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 text-white text-sm font-semibold mb-2.5"
          >
            {submitting ? "Sending…" : "Send review"}
          </button>
          <button onClick={onSkip} className="w-full py-2 text-zinc-500 text-xs font-medium">Skip</button>
        </div>
      </div>
    </div>
  );
}
