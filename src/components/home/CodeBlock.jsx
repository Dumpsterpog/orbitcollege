import { useState } from "react";
import { Icon, cx } from "../ui/Primitives.jsx";

// A fenced code block, rendered as a macOS terminal window.
//
// The composer writes ``` fences into ordinary post text, so this is a parse
// of what is already stored rather than a new field on the document. That
// means an old post containing a fence starts rendering as code with no
// migration, and a post that never had one is unaffected.
//
// No syntax highlighter. Colouring JavaScript convincingly means shipping a
// tokeniser and a theme, and the thing that actually makes a snippet readable
// in a feed is a monospace face, line numbers and the window chrome telling
// you where it starts and stops.

const FENCE = /```([a-zA-Z0-9+#.-]*)\n([\s\S]*?)```/g;

/** Splits post text into plain-text and code segments, in order. */
export function parseSegments(text = "") {
  const out = [];
  let last = 0;
  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "code", value: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.filter((s) => s.type === "code" || s.value.trim());
}

export function CodeBlock({ lang, value, filename }) {
  const [copied, setCopied] = useState(false);
  const lines = value.split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard refused; the text is on screen either way */ }
  };

  return (
    <div className="w-full bg-[#0d1117] rounded-xl border border-slate-800 overflow-hidden my-1">
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#161b22] border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </span>
          {filename && (
            <span className="font-mono text-[11.5px] text-slate-400 ml-2 font-medium truncate">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-mono text-[11px] text-slate-500 hidden sm:inline">{lang}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200
              transition-colors bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700"
          >
            <Icon name={copied ? "check" : "content_copy"} size={13} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <pre className="text-[12.5px] leading-[1.7] py-3">
          {lines.map((line, i) => (
            <div key={i} className="flex">
              <span
                aria-hidden="true"
                className="select-none shrink-0 w-10 pr-3 text-right font-mono text-[11px] text-slate-600"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <code className={cx("font-mono text-slate-300 pr-4", !line && "h-[1.7em]")}>{line}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
