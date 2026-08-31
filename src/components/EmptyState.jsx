import { Empty } from "./ui/Layout.jsx";

// Compatibility surface. `Empty` in ui/Layout.jsx is the real component;
// this maps the older prop names (icon as a component, title/subtitle) onto
// it so screens that still use them keep rendering. New code should import
// Empty directly.
export function EmptyState({ icon, title, subtitle, action, compact = false, className }) {
  // The old API passed a lucide component; the new one takes a Material
  // Symbols ligature. A component can't be converted to a ligature, so it is
  // dropped rather than rendered as "[object Object]".
  const glyph = typeof icon === "string" ? icon : undefined;
  return (
    <Empty
      icon={glyph}
      title={title}
      body={subtitle}
      action={action}
      className={compact ? "py-10" : className}
    />
  );
}
