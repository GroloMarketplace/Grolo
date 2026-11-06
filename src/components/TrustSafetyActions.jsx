import { useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTrustSafety } from "../context/TrustSafetyContext";
import { createReport, REPORT_REASONS } from "../lib/api/trustSafety";

export default function TrustSafetyActions({ contentType, targetType, contentId, targetId, reportedUserId, blockUserId, hideItem = null, compact = false, className = "" }) {
  const { user, isSuspended } = useAuth();
  const { isBlocked, block, unblock, hideContent } = useTrustSafety();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [confirmingHide, setConfirmingHide] = useState(false);
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

  async function toggleBlock() {
    setConfirmingBlock(false);
    try {
      if (blocked) {
        await unblock(blockUserId);
        setMessage("Account unblocked successfully.");
      } else {
        await block(blockUserId);
        setMessage("Account blocked successfully.");
      }
      setMenuOpen(false);
    } catch (error) {
      setMessage("Unable to update blocked account. Please try again.");
    }
  }

  async function confirmHide() {
    setConfirmingHide(false);
    try {
      await hideContent(hideItem.contentType, hideItem.contentId);
    } catch (error) {
      setMessage("Unable to hide this item. Please try again.");
    }
  }

  if (!user?.id || isSuspended || !resolvedContentId || String(user.id) === String(blockUserId)) return null;
  return (
    <div className={`relative ${compact ? "flex items-center" : "mt-3 flex items-center"} ${className}`}>
      <button type="button" aria-label="More safety options" onClick={(event) => { event.stopPropagation(); setMenuOpen((current) => !current); }} className="rounded-full p-1.5 text-[#777] hover:bg-[#F5F5F5]">
        <MoreVertical size={18} />
      </button>
      {menuOpen && <div className="absolute right-0 top-9 z-30 min-w-40 rounded-lg border border-[#E0E0E0] bg-white p-1 shadow-lg">
        {blockUserId && <button type="button" onClick={(event) => { event.stopPropagation(); if (blocked) { void toggleBlock(); } else { setMenuOpen(false); setConfirmingBlock(true); } }} className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#B42318] hover:bg-[#FFF2F0]">{blocked ? "Unblock User" : "Block User"}</button>}
        {hideItem && <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); setConfirmingHide(true); }} className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#4F5B51] hover:bg-[#F5F5F5]">🚫 Don't show on my feed</button>}
        <button type="button" onClick={(event) => { event.stopPropagation(); setMenuOpen(false); setOpen(true); }} className="block w-full rounded-md px-3 py-2 text-left text-[13px] text-[#4F5B51] hover:bg-[#F5F5F5]">{resolvedContentType === "user" ? "Report User" : "Report"}</button>
      </div>}
      {message && <span role="status" className="ml-2 text-[12px] text-[#498467]">{message}</span>}
      {confirmingBlock && createPortal(<div className="fixed inset-0 z-[120] flex items-end bg-black/30 sm:items-center sm:justify-center" onClick={() => setConfirmingBlock(false)} role="presentation">
        <div onClick={(event) => event.stopPropagation()} className="w-full rounded-t-2xl bg-white px-5 pt-5 shadow-2xl sm:max-w-[360px] sm:rounded-2xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} role="alertdialog" aria-modal="true" aria-labelledby="block-user-title">
          <h2 id="block-user-title" className="text-[17px] font-semibold text-[#1F2D27]">Block this user?</h2>
          <p className="mt-2 text-[13px] leading-[140%] text-[#4F4F4F]">They will no longer be able to see your profile, listings, or messages, and you won't see theirs. You can unblock them anytime from Blocked Users in settings.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setConfirmingBlock(false)} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Cancel</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); void toggleBlock(); }} className="flex-1 rounded-lg bg-[#B42318] py-3 text-[14px] font-medium text-white">Block User</button>
          </div>
        </div>
      </div>, document.body)}
      {confirmingHide && createPortal(<div className="fixed inset-0 z-[120] flex items-end bg-black/30 sm:items-center sm:justify-center" onClick={() => setConfirmingHide(false)} role="presentation">
        <div onClick={(event) => event.stopPropagation()} className="w-full rounded-t-2xl bg-white px-5 pt-5 shadow-2xl sm:max-w-[360px] sm:rounded-2xl" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} role="alertdialog" aria-modal="true" aria-labelledby="hide-item-title">
          <h2 id="hide-item-title" className="text-[17px] font-semibold text-[#1F2D27]">Hide this item from your Home feed?</h2>
          <p className="mt-2 text-[13px] leading-[140%] text-[#4F4F4F]">It won't appear in your Home feed again. This isn't a report and the creator won't be notified.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setConfirmingHide(false)} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Cancel</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); void confirmHide(); }} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white">Hide</button>
          </div>
        </div>
      </div>, document.body)}
      {open && createPortal(<div className="fixed inset-0 z-[120] flex items-end bg-black/30" onClick={() => setOpen(false)} role="presentation">
        <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E6ECE8] px-5 py-4"><h2 id="report-dialog-title" className="text-[18px] font-semibold">Report {resolvedContentType}</h2><span className="text-[12px] text-[#777]">Help keep Grolo safe</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <label className="flex flex-col gap-2 text-[14px] font-medium">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal">{REPORT_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="mt-3 flex flex-col gap-2 text-[14px] font-medium">Additional details <span className="text-[12px] font-normal text-[#777]">Optional</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={1000} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-2 font-normal" /></label>
          </div>
          <div className="flex shrink-0 gap-3 border-t border-[#E6ECE8] bg-white px-5 py-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-60">{submitting ? "Submitting..." : "Submit report"}</button>
          </div>
        </form>
      </div>, document.body)}
    </div>
  );
}
