import { useState } from "react";
import { Check } from "lucide-react";
import { REPORT_REASONS } from "../data/constants.js";
import { Button, Textarea, cx } from "./ui/Primitives.jsx";
import { Modal } from "./ui/Layout.jsx";

export function ReportModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");

  return (
    <Modal
      title={`Report ${target}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" onClick={() => onSubmit(reason, detail.trim())}>
            Submit report
          </Button>
        </div>
      }
    >
      <p className="text-xs font-medium text-content-secondary mb-2">Reason</p>
      <div className="space-y-1 mb-4">
        {REPORT_REASONS.map((r) => {
          const selected = reason === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              aria-pressed={selected}
              className={cx(
                "w-full flex items-center gap-2 text-left text-sm px-2.5 py-2 rounded border transition-colors",
                selected
                  ? "border-line-strong bg-surface-inset text-content"
                  : "border-line text-content-secondary hover:border-line-strong hover:text-content"
              )}
            >
              <span className="flex-1 min-w-0">{r}</span>
              {selected && <Check size={13} className="text-accent shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs font-medium text-content-secondary mb-2">
        Anything else? <span className="text-content-faint font-normal">Optional</span>
      </p>
      <Textarea
        rows={3}
        value={detail}
        maxLength={500}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Context that would help a moderator."
      />
      <p className="text-2xs text-content-faint mt-2.5 leading-relaxed">
        Reports go to the Orbit moderators. We don't tell the person who reported them.
      </p>
    </Modal>
  );
}
