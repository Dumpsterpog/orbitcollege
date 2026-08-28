// Renders /privacy and /terms as plain web pages, outside the app's normal
// tab flow (no Supabase calls, no auth needed — these must be readable by
// anyone, including Play Store reviewers, without signing in).
//
// Deliberately NOT using the app's mobile-frame `shellClass` from App.jsx —
// legal text is long-form reading, so it gets the full page width (capped
// for readability) instead of being squeezed into a phone-width card.
import { privacyContent, termsContent } from "../data/legalContent.js";

function parseInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`} className="text-zinc-900 dark:text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderLines(lines) {
  const out = [];
  let listBuffer = [];
  const flushList = (key) => {
    if (listBuffer.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1.5 my-3 text-zinc-700 dark:text-zinc-300">
          {listBuffer}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("- ")) {
      listBuffer.push(<li key={`li-${i}`}>{parseInline(line.slice(2), `li-${i}`)}</li>);
      return;
    }
    flushList(i);

    if (line === "") return; // spacing handled by margins, not empty <p>s
    if (line.startsWith("# ")) {
      out.push(<h1 key={i} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={i} className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-7 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={i} className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith(">> ")) {
      out.push(
        <p key={i} className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 my-3 text-sm italic text-zinc-500">
          {parseInline(line.slice(3), `q-${i}`)}
        </p>
      );
    } else {
      out.push(<p key={i} className="text-zinc-700 dark:text-zinc-300 leading-relaxed my-2">{parseInline(line, `p-${i}`)}</p>);
    }
  });
  flushList("end");
  return out;
}

function LegalPageBody({ content, otherHref, otherLabel }) {
  return (
    <div className="min-h-dvh bg-white dark:bg-zinc-950" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-10 sm:py-14">
        <a href="/" className="text-sm text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300">&larr; Back to Orbit</a>
        <div className="mt-6">{renderLines(content)}</div>
        <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex gap-4 text-sm">
          <a href="/" className="text-zinc-900 dark:text-zinc-50 hover:text-zinc-600 dark:hover:text-zinc-300">Back to Orbit</a>
          <a href={otherHref} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">{otherLabel}</a>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return <LegalPageBody content={privacyContent} otherHref="/terms" otherLabel="Terms of Service" />;
}

export function TermsPage() {
  return <LegalPageBody content={termsContent} otherHref="/privacy" otherLabel="Privacy Policy" />;
}
