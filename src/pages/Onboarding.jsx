import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import groloLogo from "../assets/grolo-new-logo.svg";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";
import ProfileAvatar from "../components/ProfileAvatar";
import { uploadImage } from "../lib/imageStorage";
import { normalizeUsername, validateBuyerProfile } from "../utils/validation";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { formatLocation, friendlyLocation } from "../data/locations";
import { getLatestNativePushToken, registerNativePushNotifications, requestNativePushPermission } from "../lib/pushNotifications";
import { savePushToken } from "../lib/api/pushTokens";

const INTERESTS = [
  "Farmers Markets", "Garden & Produce", "Bakery & Sweets", "Meal Prep & Catering",
  "Crafts & Handmade", "Local Events", "Workshops & Classes", "Plants & Flowers",
  "Health & Wellness", "Home & Décor", "Services", "Pet Products", "Specialty Foods",
];

function readPendingEmail() {
  try {
    return localStorage.getItem("grolo-pending-email") ?? "";
  } catch {
    return "";
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useBuyerSettings();
  const { user, updateEmail } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: readPendingEmail() || settings.email || "",
    bio: "",
    location: "",
    locationDetails: null,
    avatar: "",
    interests: [],
  });
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleInterest = (interest) => update("interests", form.interests.includes(interest)
    ? form.interests.filter((item) => item !== interest)
    : [...form.interests, interest]);

  const handleProfileContinue = () => {
    const validationError = validateBuyerProfile(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setUploadProgress({ progress: 0, stage: "Preparing profile picture" });
    try {
      const { url } = await uploadImage(file, { userId: user?.id, kind: "avatar", folder: "profiles", onProgress: setUploadProgress });
      update("avatar", url);
      setUploadProgress(null);
    } catch (error) {
      setUploadProgress(null);
      setError(error.message || "We couldn't upload that image. Please try again.");
    }
  };

  const finish = async () => {
    if (saving) return;
    const validationError = validateBuyerProfile(form);
    if (validationError) {
      setError(validationError);
      setStep(1);
      return;
    }
    const normalizedForm = { ...form, username: normalizeUsername(form.username) };
    setSaving(true);
    setError("");
    try {
      if (user?.email !== normalizedForm.email.trim()) await updateEmail(normalizedForm.email.trim());
      await updateSettings({
        ...normalizedForm,
        email: normalizedForm.email.trim(),
        location: formatLocation(normalizedForm.locationDetails) || normalizedForm.location,
        neighborhood: normalizedForm.locationDetails?.neighborhood,
        city: normalizedForm.locationDetails?.city,
        province: normalizedForm.locationDetails?.province,
        country: normalizedForm.locationDetails?.country,
        postalCode: normalizedForm.locationDetails?.postalCode,
        latitude: normalizedForm.locationDetails?.latitude,
        longitude: normalizedForm.locationDetails?.longitude,
        onboardingCompleted: true,
      });
      localStorage.removeItem("grolo-pending-email");
      setStep(5);
    } catch (saveError) {
      const message = saveError.code === "23505"
        ? "That username is already taken. Choose another one."
        : saveError.code === "23503" && saveError.message?.includes("profiles_id_fkey")
          ? "We couldn't create your profile because your sign-in session is no longer available. Please sign in again and retry."
          : saveError.message || "We couldn't save your profile. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const enterGrolo = () => navigate("/", {
    replace: true,
    state: {
      tab: "Your Community",
      communityFilter: "For You",
      refreshFeed: Date.now(),
    },
  });

  return (
    <MobileScreenLayout>
      {step > 0 && <Header title="Set up your profile" hideProfile onBack={() => setStep((current) => current - 1)} />}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-6 py-8">
        {step === 0 && <WelcomeStep onContinue={() => setStep(1)} />}
        {step === 1 && <ProfileStep form={form} update={update} error={error} onContinue={handleProfileContinue} />}
        {step === 2 && <PhotoStep form={form} handleFile={handleFile} error={error} uploadProgress={uploadProgress} onContinue={() => { setError(""); setStep(3); }} onSkip={() => { setError(""); setStep(3); }} />}
        {step === 3 && <InterestsStep interests={form.interests} toggleInterest={toggleInterest} onContinue={() => { setError(""); setStep(4); }} />}
        {step === 4 && <LocationStep form={form} update={update} error={error} saving={saving} onContinue={finish} />}
        {step === 5 && <NotificationStep settings={settings} updateSettings={updateSettings} user={user} onComplete={enterGrolo} />}
      </div>
    </MobileScreenLayout>
  );
}

function WelcomeStep({ onContinue }) {
  return <div className="flex min-h-full flex-col items-center justify-center text-center"><img src={groloLogo} alt="Grolo" className="mb-8 w-32 object-contain" /><h1 className="text-[26px] font-semibold">Welcome to Grolo</h1><p className="mt-2 text-[15px] font-medium text-[#498467]">Locally Owned. Community Grown.</p><p className="mt-5 max-w-[310px] text-[14px] leading-[150%] text-[#4F4F4F]">Support local businesses, discover unique products and services, attend community events, and grow meaningful local connections.</p><button type="button" onClick={onContinue} className="mt-8 w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">Continue</button></div>;
}

function ProfileStep({ form, update, error, onContinue }) {
  return <Step title="Let's Create Your Profile"><Field label="Display Name" value={form.displayName} onChange={(value) => update("displayName", value)} placeholder="How should the community know you?" required /><Field label="Username" value={form.username} onChange={(value) => update("username", value.replace(/\s+/g, "").toLowerCase())} placeholder="Choose a username" required /><Field label="Email Address" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="name@email.com" required /><label className="flex flex-col gap-2 text-[14px] font-medium">Bio<textarea value={form.bio} onChange={(event) => update("bio", event.target.value)} rows={4} placeholder="Discovering local makers, businesses, and community moments around Calgary." required className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><div className="rounded-lg bg-[#F5FFF6] p-3 text-[12px] text-[#5D7459]"><div className="font-medium">Preview</div>{form.displayName || form.bio ? <><div className="mt-1 font-semibold">{form.displayName}</div>{form.bio && <p className="mt-1 whitespace-pre-wrap">{form.bio}</p>}</> : <p className="mt-1">Your profile preview will appear here.</p>}</div>{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function PhotoStep({ form, handleFile, error, uploadProgress, onContinue, onSkip }) {
  return <Step title="Help Your Community Recognize You"><div className="flex flex-col items-center gap-3"><ProfileAvatar profile={{ avatar: form.avatar, name: form.displayName }} size="h-28 w-28" /><label className="cursor-pointer rounded-lg border border-[#498467] px-4 py-2 text-center text-[13px] font-medium text-[#498467]"><input type="file" accept="image/*" onChange={handleFile} className="hidden" />Upload Profile Picture</label>{uploadProgress && <UploadProgress {...uploadProgress} />}</div>{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue}>Continue</NextButton><button type="button" onClick={onSkip} className="text-[13px] font-medium text-[#498467]">Skip for Now</button></Step>;
}

function InterestsStep({ interests, toggleInterest, onContinue }) {
  return <Step title="Personalize Your Experience"><p className="text-[13px] text-[#828282]">What interests you? Choose as many as you like.</p><div className="grid grid-cols-2 gap-2">{INTERESTS.map((interest) => <button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`rounded-lg border px-3 py-3 text-left text-[12px] font-medium ${interests.includes(interest) ? "border-[#498467] bg-[#498467] text-white" : "border-[#E0E0E0] bg-white"}`}>{interest}</button>)}</div><NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function LocationStep({ form, update, error, saving, onContinue }) {
  return <Step title="Set Your Community Location"><LocationAutocomplete label="City or Location" value={form.location} location={form.locationDetails} onChange={(value) => { update("locationDetails", value); update("location", friendlyLocation(value)); }} placeholder="Search neighborhood, city, or postal code" />{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue} disabled={saving}>{saving ? "Saving profile..." : "Continue"}</NextButton></Step>;
}

function NotificationStep({ settings, updateSettings, user, onComplete }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const enableNotifications = async () => {
    setStatus("working");
    setError("");
    try {
      const permission = await requestNativePushPermission();
      if (permission === "denied") {
        setStatus("idle");
        setError("Notifications are disabled. You can enable them later in Settings.");
        return;
      }
      if (permission === "granted") {
        const saveToken = (token) => savePushToken({ userId: user?.id, token, platform: Capacitor.getPlatform() }).catch(() => {});
        const registration = await registerNativePushNotifications({ onToken: saveToken });
        const token = registration.token ?? getLatestNativePushToken();
        if (token) await saveToken(token);
        await updateSettings({ notifications: { ...settings.notifications, pushEnabled: true } });
      }
      onComplete();
    } catch (requestError) {
      setStatus("idle");
      setError(requestError.message || "We couldn't enable notifications. You can try again later.");
    }
  };

  return (
    <Step title="Stay connected with Grolo">
      <p className="text-[14px] leading-6 text-[#4F4F4F]">Get helpful updates from your community, even when the app is closed.</p>
      <div className="rounded-2xl border border-[#C9DCCB] bg-white p-4 text-[15px] shadow-sm">
        <div className="flex items-center gap-3 py-2"><span className="text-xl">💬</span><span>New messages</span></div>
        <div className="flex items-center gap-3 py-2"><span className="text-xl">🛒</span><span>New orders</span></div>
        <div className="flex items-center gap-3 py-2"><span className="text-xl">⭐</span><span>New reviews</span></div>
        <div className="flex items-center gap-3 py-2"><span className="text-xl">👥</span><span>New followers</span></div>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <NextButton onClick={enableNotifications} disabled={status === "working"}>{status === "working" ? "Enabling..." : "Enable Notifications"}</NextButton>
      <button type="button" onClick={onComplete} disabled={status === "working"} className="text-[13px] font-medium text-[#498467] disabled:opacity-50">Maybe Later</button>
    </Step>
  );
}

function Step({ title, children }) { return <div className="mx-auto flex w-full max-w-full flex-col gap-5"><div><div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-[#498467]">Grolo setup</div><h1 className="text-[24px] font-semibold">{title}</h1></div>{children}</div>; }
function Field({ label, value, onChange, placeholder, required = false }) { return <label className="flex flex-col gap-2 text-[14px] font-medium">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label>; }
function NextButton({ onClick, children, disabled = false }) { return <button type="button" onClick={onClick} disabled={disabled} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">{children}</button>; }
function ErrorMessage({ children }) { return <p role="alert" className="text-[12px] text-red-600">{children}</p>; }
function UploadProgress({ progress, stage }) { return <div className="w-full max-w-[240px] text-center text-[11px] text-[#687368]"><div className="mb-1 h-1.5 overflow-hidden rounded-full bg-[#E6E6E6]"><div className="h-full rounded-full bg-[#498467] transition-all" style={{ width: `${progress}%` }} /></div>{stage}</div>; }
