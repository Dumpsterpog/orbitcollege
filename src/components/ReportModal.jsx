import { useState } from "react";
import { X } from "lucide-react";
import { REPORT_REASONS } from "../data/constants.js";

export function ReportModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  return (
    <div className="absolute inset-0 bg-black/60 z-[60] flex items-center justify-center px-6" onClick={onClose}>
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">Report {target}</p>
          <button onClick={onClose}><X size={18} className="text-zinc-500" /></button>
        </div>
        <p className="text-xs text-zinc-500 mb-2">Reason</p>
        <div className="space-y-1.5 mb-4">
          {REPORT_REASONS.map((r) => (
            <button key={r} onClick={() => setReason(r)} className={`w-full text-left text-sm px-3 py-2 rounded-xl border ${reason === r ? "border-zinc-900 dark:border-zinc-50 bg-zinc-900/10 dark:bg-zinc-50/10 text-zinc-700 dark:text-zinc-300" : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{r}</button>
          ))}
        </div>
        <button onClick={() => onSubmit(reason)} className="w-full py-2.5 rounded-xl bg-zinc-50 text-zinc-900 text-sm font-semibold">Submit report</button>
      </div>
    </div>
  );
}
