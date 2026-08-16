import { useEffect, useRef, useState } from "react";

export function useSaveFeedback() {
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const timerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const runSave = async (operation) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setStatus("saving");
    setErrorMessage("");
    try {
      await operation();
      savingRef.current = false;
      setStatus("success");
      setLastSavedAt(new Date());
      timerRef.current = window.setTimeout(() => setStatus("idle"), 2400);
      return true;
    } catch (error) {
      savingRef.current = false;
      setStatus("error");
      setErrorMessage(error?.message || "Your changes could not be saved.");
      timerRef.current = window.setTimeout(() => setStatus("idle"), 3600);
      return false;
    }
  };

  return { status, errorMessage, lastSavedAt, runSave };
}

export function SaveButton({ status, onClick, className = "" }) {
  const labels = {
    idle: "Save Changes",
    saving: "Saving...",
    success: "✅ Saved",
    error: "❌ Save Failed",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "saving"}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {labels[status]}
    </button>
  );
}

export function SaveToast({ status, errorMessage, lastSavedAt }) {
  if (status !== "success" && status !== "error") return null;
  const message = status === "success" ? "Changes saved successfully" : errorMessage || "Unable to save changes.";
  return (
    <div role={status === "error" ? "alert" : "status"} className={`fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full px-4 py-2 text-[13px] font-medium text-white shadow-lg ${status === "error" ? "bg-[#B84A3A]" : "bg-[#498467]"}`}>
      {message}
      {status === "success" && lastSavedAt && <span className="ml-2 opacity-80">Last saved: {lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
    </div>
  );
}
