import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import MobileScreenLayout from "../components/MobileScreenLayout";
import groloLogo from "../assets/grolo-new-logo.svg";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validatePassword(value) {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use at least one letter and one number.";
  return "";
}

function PasswordField({ label, value, onChange, error, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="flex flex-col gap-2 text-[13px] font-medium text-[#30352f]">
      {label}
      <span className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-[15px] outline-none transition focus:border-[#498467] focus:ring-2 focus:ring-[#498467]/15 ${error ? "border-red-400" : "border-[#D9E0D8]"}`}
        />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#708070]">
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

export default function SignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const signup = location.pathname === "/signup";
  const { signInWithPassword, signUpWithPassword, sendPasswordReset, isAuthenticated, emailVerified, profileStatus, profileError, onboardingComplete, acceptedTerms } = useAuth();
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && profileStatus === "loaded" && onboardingComplete !== null) {
      const authDestination = emailVerified ? (onboardingComplete ? "/" : "/onboarding") : "/verify-email";
      navigate(emailVerified && !acceptedTerms ? "/terms-acceptance" : authDestination, { replace: true });
    }
    if (isAuthenticated && profileStatus === "error") setError(profileError?.message || "Unable to load your profile. Please try again.");
  }, [acceptedTerms, emailVerified, isAuthenticated, navigate, onboardingComplete, profileError, profileStatus]);

  const clearError = () => { if (error) setError(""); };
  const normalizedEmail = email.trim().toLowerCase();

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) { setError("Enter a valid email address."); return; }
    if (forgot) {
      try { setStatus("sending"); await sendPasswordReset(normalizedEmail); setStatus("sent"); } catch (err) { setError(err.message || "Unable to send the reset email."); setStatus("idle"); }
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) { setError(passwordError); return; }
    if (signup && !name.trim()) { setError("Name is required."); return; }
    if (signup && password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!termsAccepted) { setError("You must agree to the Terms of Use, Privacy Policy, and Community Guidelines to continue."); return; }
    if (!isSupabaseConfigured) { setError("Authentication is currently unavailable. Please try again later."); return; }
    try {
      setStatus("working");
      if (signup) {
        const data = await signUpWithPassword(normalizedEmail, password, name);
        try { localStorage.setItem("grolo-pending-email", normalizedEmail); } catch { }
        const verified = Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at || data.session?.user?.email_confirmed_at || data.session?.user?.confirmed_at);
        if (verified) navigate("/onboarding", { replace: true });
        else setStatus("confirmation");
      } else {
        await signInWithPassword(normalizedEmail, password);
      }
    } catch (err) { setError(err.message || "Authentication failed. Please try again."); setStatus("idle"); }
  }

  function switchMode() { setError(""); setForgot(false); navigate(signup ? "/signin" : "/signup", { state: signup ? undefined : { allowSignup: true } }); }

  const title = forgot ? "Reset your password" : signup ? "Create your account" : "Welcome back";
  const subtitle = forgot ? "We'll email you a secure link to choose a new password." : signup ? "Join your local marketplace community." : "Sign in to continue to your local marketplace.";

  return (
    <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          {forgot ? <button type="button" onClick={() => { setForgot(false); setStatus("idle"); setError(""); }} className="flex items-center gap-1 text-[13px] font-medium text-[#498467]"><ArrowLeft size={16} /> Back</button> : <span />}
          <img src={groloLogo} alt="Grolo" className="h-auto w-32 object-contain" />
        </div>
        <div className="my-auto py-10">
          <div className="mb-8">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Locally owned, community grown</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#202A21]">{title}</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#687368]">{subtitle}</p>
          </div>

          {status === "confirmation" || status === "sent" ? (
            <div className="rounded-2xl border border-[#C9DCCB] bg-white p-6 text-center shadow-sm">
              <CheckCircle2 className="mx-auto mb-3 text-[#498467]" size={30} />
              <h2 className="text-lg font-semibold text-[#202A21]">Check your inbox</h2>
              <p className="mt-2 text-sm leading-6 text-[#687368]">{status === "confirmation" ? `Check your email and verify your email address. Confirm your email before returning here to sign in${email ? `: ${email}` : ""}.` : "We sent a secure password reset link to your email address."}</p>
              <button type="button" onClick={() => { setStatus("idle"); setForgot(false); navigate("/signin", { replace: true }); }} className="mt-5 text-sm font-semibold text-[#498467]">Return to sign in</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {signup && <label className="flex flex-col gap-2 text-[13px] font-medium text-[#30352f]">Name<input value={name} onChange={(event) => { setName(event.target.value); clearError(); }} autoComplete="name" placeholder="Your name" className="h-12 rounded-xl border border-[#D9E0D8] bg-white px-4 text-[15px] outline-none focus:border-[#498467] focus:ring-2 focus:ring-[#498467]/15" /></label>}
              <label className="flex flex-col gap-2 text-[13px] font-medium text-[#30352f]">Email<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearError(); }} autoComplete="email" placeholder="you@example.com" className="h-12 rounded-xl border border-[#D9E0D8] bg-white px-4 text-[15px] outline-none focus:border-[#498467] focus:ring-2 focus:ring-[#498467]/15" /></label>
              {!forgot && <PasswordField label="Password" value={password} onChange={(event) => { setPassword(event.target.value); clearError(); }} autoComplete={signup ? "new-password" : "current-password"} error={error} />}
              {signup && <><p className="-mt-1 text-xs text-[#748074]">At least 8 characters with one letter and one number.</p><PasswordField label="Confirm password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearError(); }} autoComplete="new-password" error={error} /></>}
              {!forgot && <label className="flex items-start gap-3 rounded-xl border border-[#D9E0D8] bg-white p-3 text-[13px] leading-5 text-[#4F5B51]">
                <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); clearError(); }} className="mt-1 h-4 w-4 shrink-0 accent-[#498467]" />
                <span>I agree to the <button type="button" onClick={() => navigate("/terms")} className="font-semibold text-[#498467] underline underline-offset-2">Terms of Use</button>, <button type="button" onClick={() => navigate("/privacy")} className="font-semibold text-[#498467] underline underline-offset-2">Privacy Policy</button>, and <button type="button" onClick={() => navigate("/community-guidelines")} className="font-semibold text-[#498467] underline underline-offset-2">Community Guidelines</button>.</span>
              </label>}
              {error && <p role="alert" className="rounded-lg bg-[#FFF2F0] px-3 py-2 text-[13px] text-[#B42318]">{error}</p>}
              <button type="submit" disabled={status === "working" || status === "sending" || (!forgot && !termsAccepted)} className="h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#376B50] disabled:cursor-not-allowed disabled:opacity-60">{status === "working" ? "Please wait..." : status === "sending" ? "Sending link..." : forgot ? "Send reset link" : signup ? "Create account" : "Sign in"}</button>
              {!signup && !forgot && <button type="button" onClick={() => { setForgot(true); setError(""); }} className="w-full text-center text-[13px] font-semibold text-[#498467]">Forgot password?</button>}
            </form>
          )}

          {!forgot && status !== "confirmation" && status !== "sent" && (
            <p className="mt-6 text-center text-sm text-[#687368]">{signup ? "Already have an account?" : "New to Grolo?"} <button type="button" onClick={switchMode} className="font-semibold text-[#498467]">{signup ? "Sign in" : "Create an account"}</button></p>
          )}
        </div>
        <p className="text-center text-xs leading-5 text-[#899389]">
          By continuing, you agree to our <button type="button" onClick={() => navigate("/terms")} className="font-semibold text-[#498467] underline underline-offset-2">Terms of Service</button> and <button type="button" onClick={() => navigate("/privacy")} className="font-semibold text-[#498467] underline underline-offset-2">Privacy Policy</button>.
        </p>
      </div>
    </MobileScreenLayout>
  );
}
