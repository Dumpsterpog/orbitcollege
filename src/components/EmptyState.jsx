import { Empty } from "./ui/Layout.jsx";

export function EmptyState({ icon, title, subtitle, action, compact = false, className }) {
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
