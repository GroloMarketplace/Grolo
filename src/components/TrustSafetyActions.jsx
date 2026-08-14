import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTrustSafety } from "../context/TrustSafetyContext";
import { createReport, REPORT_REASONS } from "../lib/api/trustSafety";

export default function TrustSafetyActions({ targetType, targetId, blockUserId, compact = false }) {
  const { user } = useAuth();
  const { isBlocked, block, unblock } = useTrustSafety();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0][0]);
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const blocked = blockUserId ? isBlocked(blockUserId) : false;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createReport({ reporterId: user.id, targetType, targetId, reason, details });
      setMessage("Report submitted.");
      setDetails("");
      setOpen(false);
    } catch (error) { setMessage(error.message || "Report could not be submitted."); }
  };

  if (!user?.id || String(user.id) === String(blockUserId)) return null;
  return (
    <div className={compact ? "flex items-center gap-2" : "mt-3 flex items-center gap-3"}>
      {blockUserId && <button type="button" onClick={() => (blocked ? unblock(blockUserId) : block(blockUserId)).catch((error) => setMessage(error.message))} className="text-[12px] font-medium text-[#B42318]">{blocked ? "Unblock" : "Block"}</button>}
      <button type="button" onClick={() => setOpen(true)} className="text-[12px] font-medium text-[#777]">Report</button>
      {message && <span role="status" className="text-[12px] text-[#498467]">{message}</span>}
      {open && <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={() => setOpen(false)}><form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full rounded-t-2xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Report {targetType}</h2><button type="button" onClick={() => setOpen(false)} className="text-[13px] text-[#777]">Cancel</button></div><label className="mt-4 flex flex-col gap-2 text-[14px] font-medium">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal">{REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-3 flex flex-col gap-2 text-[14px] font-medium">Details<textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal" /></label><button type="submit" className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Submit report</button></form></div>}
    </div>
  );
}
