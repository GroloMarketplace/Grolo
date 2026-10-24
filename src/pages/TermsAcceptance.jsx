import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MobileScreenLayout from "../components/MobileScreenLayout";
import groloLogo from "../assets/grolo-new-logo.svg";

export default function TermsAcceptance() {
  const navigate = useNavigate();
  const { acceptTerms, onboardingComplete } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!accepted) return;
    setStatus("working");
    setError("");
    try {
      await acceptTerms();
      navigate(onboardingComplete ? "/" : "/onboarding", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save your acceptance. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <img src={groloLogo} alt="Grolo" className="h-auto w-32 object-contain" />
        <main className="my-auto py-10">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Action required</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#202A21]">Review and accept our terms</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#687368]">Before you continue into Grolo, please review and actively accept the agreements that keep our marketplace safe and respectful.</p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="flex items-start gap-3 rounded-xl border border-[#D9E0D8] bg-white p-4 text-[14px] leading-6 text-[#4F5B51]">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#498467]" />
              <span>I agree to the <button type="button" onClick={() => navigate("/terms")} className="font-semibold text-[#498467] underline underline-offset-2">Terms of Use</button>, <button type="button" onClick={() => navigate("/privacy")} className="font-semibold text-[#498467] underline underline-offset-2">Privacy Policy</button>, and <button type="button" onClick={() => navigate("/community-guidelines")} className="font-semibold text-[#498467] underline underline-offset-2">Community Guidelines</button>.</span>
            </label>
            {error && <p role="alert" className="rounded-lg bg-[#FFF2F0] px-3 py-2 text-[13px] text-[#B42318]">{error}</p>}
            <button type="submit" disabled={!accepted || status === "working"} className="h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#376B50] disabled:cursor-not-allowed disabled:opacity-60">{status === "working" ? "Saving..." : "Accept and continue"}</button>
          </form>
        </main>
      </div>
    </MobileScreenLayout>
  );
}
