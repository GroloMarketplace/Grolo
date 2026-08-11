import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import MobileScreenLayout from "../components/MobileScreenLayout";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignIn() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithProvider, isAuthenticated, profileStatus, profileError, onboardingComplete } = useAuth();
  const [email, setEmail] = useState("");
  const [accountDeleted] = useState(() => {
    const deleted = sessionStorage.getItem("grolo-account-deleted") === "true";
    if (deleted) sessionStorage.removeItem("grolo-account-deleted");
    return deleted;
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && profileStatus === "loaded" && onboardingComplete !== null) {
      navigate(onboardingComplete ? "/" : "/onboarding", { replace: true });
    }
    if (isAuthenticated && profileStatus === "error") {
      setError(profileError?.message || "Unable to load your profile. Please try again.");
    }
  }, [isAuthenticated, navigate, onboardingComplete, profileError, profileStatus]);

  async function handleContinue() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    try {
      localStorage.setItem("grolo-pending-email", normalizedEmail);
    } catch {
      // Continue even if local persistence is unavailable.
    }
    if (!isSupabaseConfigured) {
      navigate("/onboarding");
      return;
    }
    try {
      setStatus("sending");
      await signInWithEmail(email);
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("idle");
    }
  }

  async function handleProvider(provider) {
    setError("");
    if (!isSupabaseConfigured) {
      navigate("/onboarding");
      return;
    }
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <MobileScreenLayout className="bg-white flex flex-col justify-between px-6 pb-8 min-h-full">
      <div className="flex flex-col items-center gap-2 mt-8">
        <img 
          src="/grolo-logo.svg" 
          alt="Grolo Logo" 
          className="w-40 h-auto"
        />
      </div>

      <div className="flex flex-col items-center gap-6 mt-auto">
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-[16px] font-semibold">Sign in or create an account</div>
          <div className="text-[14px]">
            Enter your email to continue to Grolo
          </div>
        </div>

        {accountDeleted && <div role="status" className="w-full rounded-lg border border-[#C9DCCB] bg-[#F5FFF6] px-4 py-3 text-center text-[13px] text-[#355F45]">Your account has been successfully deleted.</div>}
        <div className="w-full rounded-lg border border-[#C9DCCB] bg-[#F5FFF6] px-4 py-3 text-[13px] text-[#355F45]">
          Your new account starts as a Buyer. You can open a store anytime from your account settings.
        </div>

        {status === "sent" ? (
          <p className="text-[14px] text-center text-[#498467]">
            Check your inbox for a magic link to finish signing in.
          </p>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="email@domain.com"
              aria-invalid={Boolean(error)}
              className={`h-10 rounded-lg border bg-white px-4 text-[14px] outline-none ${error ? "border-red-500" : "border-[#E0E0E0]"}`}
            />
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <button
              onClick={handleContinue}
              disabled={status === "sending"}
              className="h-10 rounded-lg bg-[#498467] text-white text-[14px] font-medium disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Continue"}
            </button>
          </div>
        )}

        <div className="w-full flex items-center gap-2">
          <span className="flex-1 h-px bg-[#498467]" />
          <span className="text-[14px]">or</span>
          <span className="flex-1 h-px bg-[#498467]" />
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => handleProvider("google")}
            className="h-10 rounded-lg bg-[#EEE] text-[14px] font-medium flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
          <button
            onClick={() => handleProvider("apple")}
            className="h-10 rounded-lg bg-[#EEE] text-[14px] font-medium flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className="text-[12px] text-center">
          By clicking continue, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>

      <div className="text-center text-[14px] text-[#5D7459] mt-8">
        Locally Owned, Community Grown
      </div>
    </MobileScreenLayout>
  );
}
