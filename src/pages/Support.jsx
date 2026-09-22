import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAuth } from "../context/AuthContext";

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.0";
const SUPPORT_EMAIL = "support@grolomarketplace.ca";
const CATEGORIES = ["Account", "Listings", "Orders", "Payments", "Safety", "Technical issue", "Other"];

function initialForm(user) {
  return {
    name: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "",
    email: user?.email ?? "",
    category: "Account",
    subject: "",
    message: "",
  };
}

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(() => initialForm(user));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const missingField = ["name", "email", "category", "subject", "message"].find((field) => !form[field].trim());
    if (missingField) {
      setError("Please complete all required fields.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    const accountInfo = {
      accountId: user?.id ?? "Unauthenticated",
      accountEmail: user?.email ?? form.email.trim(),
    };
    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Account ID: ${accountInfo.accountId}`,
      `Account Email: ${accountInfo.accountEmail}`,
      `Category: ${form.category}`,
      `Subject: ${form.subject.trim()}`,
      "",
      form.message.trim(),
      "",
      `Timestamp: ${new Date().toISOString()}`,
      `App version: ${APP_VERSION}`,
    ].join("\n");

    try {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Grolo Support] ${form.subject.trim()}`)}&body=${encodeURIComponent(body)}`;
      setSubmitted(true);
    } catch {
      setError("We could not open your email app. Please email support@grolomarketplace.ca directly.");
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <MobileScreenLayout className="bg-[#F8FBF7]">
        <Header title="Grolo Support" onBack={() => navigate(-1)} hideProfile />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#CFF7D3] text-[#02542D]" aria-hidden="true">✓</div>
          <h1 className="mt-5 text-2xl font-semibold text-[#202A21]">Support Request Sent</h1>
          <p className="mt-3 max-w-sm text-[14px] leading-6 text-[#4F5B51]">Thank you for contacting Grolo Support. We will respond via email as soon as possible.</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-7 h-12 w-full max-w-sm rounded-xl bg-[#498467] text-[15px] font-semibold text-white">Done</button>
        </div>
      </MobileScreenLayout>
    );
  }

  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Grolo Support" onBack={() => navigate(-1)} hideProfile />
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-md">
          <p className="text-[14px] leading-6 text-[#4F5B51]">Tell us how we can help. Required fields are marked <span aria-hidden="true">*</span>.</p>
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</div>}
            <Field label="Name" required value={form.name} onChange={(value) => updateField("name", value)} autoComplete="name" />
            <Field label="Email" required type="email" value={form.email} onChange={(value) => updateField("email", value)} autoComplete="email" />
            <label className="block text-[14px] font-medium text-[#202A21]">Category <span aria-hidden="true">*</span><select required value={form.category} onChange={(event) => updateField("category", event.target.value)} className="mt-2 w-full rounded-xl border border-[#D7E1D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#498467]"><option value="">Select a category</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <Field label="Subject" required value={form.subject} onChange={(value) => updateField("subject", value)} />
            <label className="block text-[14px] font-medium text-[#202A21]">Message <span aria-hidden="true">*</span><textarea required value={form.message} onChange={(event) => updateField("message", event.target.value)} rows={6} className="mt-2 w-full resize-y rounded-xl border border-[#D7E1D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#498467]" /></label>
            <button type="submit" disabled={sending} className="h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white transition-colors hover:bg-[#376B50] disabled:cursor-not-allowed disabled:opacity-60">{sending ? "Opening Email..." : "Send Support Request"}</button>
          </form>
          <nav aria-label="Legal information" className="mt-7 border-t border-[#D7E1D8] pt-5 text-center text-[13px]">
            <a href="/community-guidelines" className="text-[#498467] underline">Community Guidelines</a><span className="mx-2 text-[#A0ACA2]">·</span><a href="/terms" className="text-[#498467] underline">Terms of Service</a><span className="mx-2 text-[#A0ACA2]">·</span><a href="/privacy" className="text-[#498467] underline">Privacy Policy</a>
          </nav>
        </div>
      </main>
    </MobileScreenLayout>
  );
}

function Field({ label, required, type = "text", value, onChange, autoComplete }) {
  return <label className="block text-[14px] font-medium text-[#202A21]">{label} {required && <span aria-hidden="true">*</span>}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} className="mt-2 w-full rounded-xl border border-[#D7E1D8] bg-white px-3 py-3 text-[14px] outline-none focus:border-[#498467]" /></label>;
}
