import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrustSafety } from "../context/TrustSafetyContext";
import { createReport, REPORT_REASONS } from "../lib/api/trustSafety";

export default function TrustSafetyActions({ contentType, targetType, contentId, targetId, reportedUserId, blockUserId, compact = false }) {
  const { user, isSuspended } = useAuth();
  const { isBlocked, block, unblock } = useTrustSafety();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0][0]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const blocked = blockUserId ? isBlocked(blockUserId) : false;
  const resolvedContentType = contentType ?? targetType;
  const resolvedContentId = contentId ?? targetId;

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createReport({
        reporterUserId: user.id,
        reportedUserId: reportedUserId ?? blockUserId,
        contentType: resolvedContentType,
        contentId: resolvedContentId,
        reason,
        optionalDescription: description.trim(),
      });
      setMessage("Report submitted successfully.");
      setDescription("");
      setMenuOpen(false);
      setOpen(false);
    } catch (error) {
      setMessage(error.message || "Report could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user?.id || isSuspended || !resolvedContentId || String(user.id) === String(blockUserId)) return null;
  return (
    <div className={`relative ${compact ? "flex items-center" : "mt-3 flex items-center"}`}>
      <button type="button" aria-label="More safety options" onClick={() => setMenuOpen((current) => !current)} className="rounded-full p-1.5 text-[#777] hover:bg-[#F5F5F5]">
        <MoreVertical size={18} />
      </button>
      {menuOpen && <div className="absolute right-0 top-9 z-30 min-w-40 rounded-lg border border-[#E0E0E0] bg-white p-1 shadow-lg">
        {blockUserId && <button type="button" onClick={() => { setMenuOpen(false); (blocked ? unblock(blockUserId) : block(blockUserId)).catch((error) => setMessage(error.message)); }} className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#B42318] hover:bg-[#FFF2F0]">{blocked ? "Unblock" : "Block"}</button>}
        <button type="button" onClick={() => { setMenuOpen(false); setOpen(true); }} className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#4F5B51] hover:bg-[#F5F5F5]">Report</button>
      </div>}
      {message && <span role="status" className="ml-2 text-[12px] text-[#498467]">{message}</span>}
      {open && <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={() => setOpen(false)}>
        <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full rounded-t-2xl bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="text-[18px] font-semibold">Report {resolvedContentType}</h2><button type="button" onClick={() => setOpen(false)} className="text-[13px] text-[#777]">Cancel</button></div>
          <label className="mt-4 flex flex-col gap-2 text-[14px] font-medium">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal">{REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="mt-3 flex flex-col gap-2 text-[14px] font-medium">Additional details <span className="text-[12px] font-normal text-[#777]">Optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal" /></label>
          <button type="submit" disabled={submitting} className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-60">{submitting ? "Submitting..." : "Submit report"}</button>
        </form>
      </div>}
    </div>
  );
}
