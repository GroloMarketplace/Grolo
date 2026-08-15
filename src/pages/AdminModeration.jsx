import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { getAdminReports, setReportStatus, suspendTarget } from "../lib/api/trustSafety";

const STATUSES = ["Open", "Under Review", "Resolved", "Dismissed"];

export default function AdminModeration() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("Open");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const PAGE_SIZE = 30;

  const loadReports = useCallback(() => {
    setLoading(true);
    getAdminReports({ status: filter, limit: PAGE_SIZE })
      .then((rows) => { setReports(rows); setHasMore(rows.length === PAGE_SIZE); })
      .catch((loadError) => setError(loadError.message || "Reports could not be loaded."))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await getAdminReports({ status: filter, limit: PAGE_SIZE, offset: reports.length });
      setReports((current) => [...current, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (loadError) {
      setError(loadError.message || "More reports could not be loaded.");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateStatus = async (report, status) => {
    try {
      const updated = await setReportStatus(report.id, status);
      setReports((current) => current.map((item) => item.id === report.id ? (updated ?? { ...item, status }) : item));
    } catch (statusError) { setError(statusError.message || "Report status could not be updated."); }
  };

  const suspend = async (report, suspended) => {
    try {
      await suspendTarget(report.target_type, report.target_id, suspended);
      setError("");
    } catch (suspendError) { setError(suspendError.message || "Target could not be moderated."); }
  };

  const visibleReports = reports.filter((report) => filter === "All" || report.status === filter);
  return (
    <MobileScreenLayout>
      <Header title="Trust & Safety" onBack={() => navigate("/shop")} />
      <div className="flex-1 overflow-y-auto px-4 py-5 no-scrollbar">
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {[...STATUSES, "All"].map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium ${filter === status ? "bg-[#498467] text-white" : "bg-[#F5F5F5]"}`}>{status}</button>)}
        </div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</div>}
        {loading && <p className="py-10 text-center text-[14px] text-[#777]">Loading reports...</p>}
        {!loading && visibleReports.length === 0 && <p className="py-10 text-center text-[14px] text-[#777]">No reports in this queue.</p>}
        <div className="flex flex-col gap-3">
          {visibleReports.map((report) => <article key={report.id} className="rounded-xl border border-[#E0E0E0] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold capitalize">{report.target_type} report</p><p className="mt-1 text-[12px] text-[#777]">Target: {report.target_id}</p></div><span className="rounded-full bg-[#F5F5F5] px-2 py-1 text-[11px]">{report.status}</span></div>
            <p className="mt-3 text-[14px] font-medium">{report.reason.replaceAll("_", " ")}</p>
            {report.details && <p className="mt-1 text-[13px] text-[#555]">{report.details}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.filter((status) => status !== report.status).map((status) => <button key={status} type="button" onClick={() => updateStatus(report, status)} className="rounded-lg border border-[#498467] px-2.5 py-1.5 text-[12px] text-[#498467]">{status}</button>)}
              {(report.target_type === "user" || report.target_type === "listing") && <button type="button" onClick={() => suspend(report, true)} className="rounded-lg bg-[#B42318] px-2.5 py-1.5 text-[12px] text-white">Suspend {report.target_type}</button>}
            </div>
          </article>)}
        </div>
        {hasMore && <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-4 w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467] disabled:opacity-50">{loadingMore ? "Loading…" : "Load more"}</button>}
      </div>
    </MobileScreenLayout>
  );
}
