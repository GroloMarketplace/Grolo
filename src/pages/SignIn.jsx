import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function SignIn() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithProvider, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  async function handleContinue() {
    setError("");
    if (!isSupabaseConfigured) {
      navigate("/");
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
      navigate("/");
      return;
    }
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-[812px] bg-[#E6DCCF] flex flex-col justify-between px-6 pt-24 pb-8">
      <div className="flex flex-col items-center gap-2 mt-16">
        <div className="w-[124px] h-[124px] rounded-full bg-white/60 flex items-center justify-center text-4xl">
          🌿
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-auto">
        <div className="flex flex-col items-center gap-0.5">
          <div className="text-[16px] font-semibold">Create an account</div>
          <div className="text-[14px]">
            Enter your email to sign up for this app
          </div>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-4 text-[14px] outline-none"
            />
            <button
              onClick={handleContinue}
              disabled={status === "sending"}
              className="h-10 rounded-lg bg-[#498467] text-white text-[14px] font-medium disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Continue"}
            </button>
            {error && (
              <p className="text-[12px] text-center text-red-600">{error}</p>
            )}
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
            className="h-10 rounded-lg bg-[#EEE] text-[14px] font-medium"
          >
            Continue with Google
          </button>
          <button
            onClick={() => handleProvider("apple")}
            className="h-10 rounded-lg bg-[#EEE] text-[14px] font-medium"
          >
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
    </div>
  );
}
