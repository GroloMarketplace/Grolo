import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import MobileScreenLayout from "../components/MobileScreenLayout";
import groloLogo from "../assets/grolo-new-logo.svg";
import { readPendingVerificationEmail, useAuth } from "../context/AuthContext";

export default function ConfirmEmail() {
  const navigate = useNavigate();

  return (
    <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <img src={groloLogo} alt="Grolo" className="h-auto w-32 self-end object-contain" />
        <div className="my-auto py-10">
          <div className="rounded-2xl border border-[#C9DCCB] bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-3 text-[#498467]" size={34} />
            <h1 className="text-2xl font-semibold text-[#202A21]">Email Confirmed</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#687368]">Your email has been successfully verified.</p>
            <p className="mt-1 text-[15px] leading-6 text-[#687368]">You can now log in and start exploring Grolo.</p>
            <button type="button" onClick={() => navigate("/signin", { replace: true })} className="mt-6 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">
              Log In
            </button>
            <button type="button" onClick={() => navigate("/", { replace: true })} className="mt-3 w-full py-2 text-[14px] font-medium text-[#498467]">
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const { authInitialized, isAuthenticated, user, emailVerified, resendVerificationEmail, refreshSession, signOut } = useAuth();
  const pendingEmail = readPendingVerificationEmail();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (authInitialized && isAuthenticated && emailVerified) return <Navigate to="/" replace />;
  if (authInitialized && !isAuthenticated && !pendingEmail) return <Navigate to="/signin" replace />;

  const resend = async () => {
    setStatus("working");
    setError("");
    try {
      await resendVerificationEmail(user?.email || pendingEmail);
      setStatus("sent");
    } catch (resendError) {
      setStatus("idle");
      setError(resendError.message || "We couldn't resend the verification email.");
    }
  };

  const checkVerification = async () => {
    setStatus("working");
    setError("");
    try {
      const { session } = await refreshSession();
      if (!session?.user) {
        setStatus("idle");
        setError("After confirming your email, return to sign in so we can start onboarding.");
        return;
      }
      if (!emailVerified && !session.user.email_confirmed_at && !session.user.confirmed_at) {
        setStatus("idle");
        setError("Your email is not verified yet. Open the verification link, then try again.");
        return;
      }
      navigate("/", { replace: true });
    } catch (refreshError) {
      setStatus("idle");
      setError(refreshError.message || "We couldn't check your verification status.");
    }
  };

  const leave = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  return (
    <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <img src={groloLogo} alt="Grolo" className="h-auto w-32 self-end object-contain" />
        <div className="my-auto py-10">
          <div className="rounded-2xl border border-[#C9DCCB] bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-3 text-[#498467]" size={34} />
            <h1 className="text-2xl font-semibold text-[#202A21]">Verify your email</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#687368]">Confirm your email before setting up your Grolo profile.</p>
            <p className="mt-1 break-words text-[14px] leading-6 text-[#687368]">We sent a verification link to {user?.email || pendingEmail || "your account email"}.</p>
            {status === "sent" && <p className="mt-3 text-[13px] text-[#355F45]">Verification email sent.</p>}
            {error && <p role="alert" className="mt-3 text-[13px] text-[#B42318]">{error}</p>}
            <button type="button" onClick={checkVerification} disabled={status === "working"} className="mt-6 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">{status === "working" ? "Checking..." : "I've verified my email"}</button>
            <button type="button" onClick={resend} disabled={status === "working"} className="mt-3 w-full py-2 text-[14px] font-medium text-[#498467] disabled:opacity-60">Resend verification email</button>
            <button type="button" onClick={leave} className="mt-2 w-full py-2 text-[14px] font-medium text-[#687368]">Sign out</button>
          </div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
