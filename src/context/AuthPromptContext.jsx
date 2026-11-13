import { createContext, useCallback, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const AuthPromptContext = createContext(null);

const ACCOUNT_FEATURES = [
  "Message sellers",
  "Follow members",
  "Create listings",
  "Participate in Community",
];

function AuthPromptModal({ feature, onSignIn, onCreateAccount, onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
      onClick={onDismiss}
    >
      <section
        className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="auth-prompt-title" className="text-[20px] font-semibold">Sign in to continue</h2>
        <p className="mt-3 text-[14px] leading-[150%] text-[#4F4F4F]">
          {feature ? `Create an account to ${feature}. With an account you can also:` : "Create an account to:"}
        </p>
        <ul className="mt-2 list-disc pl-5 text-[14px] leading-[160%] text-[#4F4F4F]">
          {ACCOUNT_FEATURES.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="w-full rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={onCreateAccount}
            className="w-full rounded-lg border border-[#498467] py-3 text-[14px] font-medium text-[#498467]"
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 text-[13px] font-medium text-[#828282]"
          >
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}

export function AuthPromptProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(null);

  const promptAuth = useCallback((options) => {
    setPrompt({ feature: typeof options === "string" ? options : options?.feature ?? null });
  }, []);

  const requireAuth = useCallback((action, options) => {
    if (isAuthenticated) {
      action?.();
      return true;
    }
    promptAuth(options);
    return false;
  }, [isAuthenticated, promptAuth]);

  const dismissPrompt = useCallback(() => setPrompt(null), []);

  const goToSignIn = useCallback(() => {
    setPrompt(null);
    navigate("/signin");
  }, [navigate]);

  const goToSignUp = useCallback(() => {
    setPrompt(null);
    navigate("/signup", { state: { allowSignup: true } });
  }, [navigate]);

  return (
    <AuthPromptContext.Provider value={{ promptAuth, requireAuth, isAuthenticated }}>
      {children}
      {prompt && (
        <AuthPromptModal
          feature={prompt.feature}
          onSignIn={goToSignIn}
          onCreateAccount={goToSignUp}
          onDismiss={dismissPrompt}
        />
      )}
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt() {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error("useAuthPrompt must be used within an AuthPromptProvider");
  return ctx;
}
