// Renders /privacy and /terms as plain web pages, outside the app's normal
// tab flow (no database calls, no auth needed — these must be readable by
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
      return <strong key={`${keyPrefix}-${i}`} className="text-ink font-semibold">{part.slice(2, -2)}</strong>;
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
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1.5 my-3 text-ink-2">
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
      out.push(<h1 key={i} className="text-3xl font-semibold text-ink mt-2 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      out.push(<h2 key={i} className="text-xl font-semibold text-ink mt-8 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      out.push(<h3 key={i} className="text-lg font-semibold text-ink mt-5 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith(">> ")) {
      out.push(
        <p key={i} className="border-l-2 border-line-strong pl-3 my-3 text-sm italic text-ink-2">
          {parseInline(line.slice(3), `q-${i}`)}
        </p>
      );
    } else {
      out.push(<p key={i} className="text-ink-2 leading-relaxed my-2.5">{parseInline(line, `p-${i}`)}</p>);
    }
  });
  flushList("end");
  return out;
}

function LegalPageBody({ content, otherHref, otherLabel }) {
  return (
    <div className="min-h-dvh bg-bg" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-10 sm:py-14">
        <a href="/" className="inline-flex items-center h-11 text-sm text-ink-2 hover:text-ink transition-colors">&larr; Back to Orbit</a>
        <div className="mt-6">{renderLines(content)}</div>
        <div className="mt-12 pt-6 border-t border-line flex gap-5 text-sm">
          <a href="/" className="inline-flex items-center h-11 text-ink hover:text-ink-2 transition-colors">Back to Orbit</a>
          <a href={otherHref} className="inline-flex items-center h-11 text-ink-2 hover:text-ink transition-colors">{otherLabel}</a>
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
