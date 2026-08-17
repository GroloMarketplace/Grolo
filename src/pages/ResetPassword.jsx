import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MobileScreenLayout from "../components/MobileScreenLayout";

function validatePassword(value) {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use at least one letter and one number.";
  return "";
}

function PasswordInput({ value, onChange, label }) {
  return <label className="flex flex-col gap-2 text-[13px] font-medium text-[#30352f]">{label}<input type="password" value={value} onChange={onChange} autoComplete="new-password" className="h-12 rounded-xl border border-[#D9E0D8] bg-white px-4 text-[15px] outline-none focus:border-[#498467] focus:ring-2 focus:ring-[#498467]/15" /></label>;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (saved) return;
    const timer = window.setTimeout(() => {
      if (!session) setError("This reset link is invalid or has expired. Request a new one and try again.");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [saved, session]);

  async function submit(event) {
    event.preventDefault();
    const validationError = validatePassword(password);
    if (validationError) { setError(validationError); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    try { setWorking(true); setError(""); await updatePassword(password); setSaved(true); } catch (err) { setError(err.message || "Unable to update your password."); } finally { setWorking(false); }
  }

  return <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10"><div className="mx-auto flex w-full max-w-md flex-1 flex-col"><img src="/grolo-logo.svg" alt="Grolo" className="h-auto w-24 self-end" /><div className="my-auto py-10"><p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Account security</p><h1 className="text-3xl font-semibold tracking-tight text-[#202A21]">Choose a new password</h1><p className="mt-2 text-[15px] leading-6 text-[#687368]">Create a password you’ll use to sign in to Grolo.</p>{saved ? <div className="mt-8 rounded-2xl border border-[#C9DCCB] bg-white p-6 text-center shadow-sm"><CheckCircle2 className="mx-auto mb-3 text-[#498467]" size={30} /><h2 className="text-lg font-semibold text-[#202A21]">Password updated</h2><p className="mt-2 text-sm text-[#687368]">Your account is secure. You can now sign in with your new password.</p><button type="button" onClick={() => navigate("/signin", { replace: true })} className="mt-5 text-sm font-semibold text-[#498467]">Go to sign in</button></div> : <form onSubmit={submit} className="mt-8 space-y-4"><PasswordInput label="New password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} /><p className="-mt-1 text-xs text-[#748074]">At least 8 characters with one letter and one number.</p><PasswordInput label="Confirm new password" value={confirm} onChange={(event) => { setConfirm(event.target.value); setError(""); }} />{error && <p role="alert" className="rounded-lg bg-[#FFF2F0] px-3 py-2 text-[13px] text-[#B42318]">{error}</p>}<button type="submit" disabled={working || !session} className="h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm disabled:opacity-60">{working ? "Updating..." : "Update password"}</button>{!session && <Link to="/signin" className="block text-center text-sm font-semibold text-[#498467]">Request a new reset link</Link>}</form>}</div><p className="text-center text-xs leading-5 text-[#899389]">Your password is handled securely by Supabase.</p></div></MobileScreenLayout>;
}
