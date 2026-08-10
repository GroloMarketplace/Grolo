import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";
import ProfileAvatar from "../components/ProfileAvatar";

const ONBOARDING_KEY = "grolo-onboarding-complete";
const INTERESTS = [
  "Farmers Markets", "Garden & Produce", "Bakery & Sweets", "Meal Prep & Catering",
  "Crafts & Handmade", "Local Events", "Workshops & Classes", "Plants & Flowers",
  "Health & Wellness", "Home & Décor", "Services", "Pet Products", "Specialty Foods",
];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function readPendingEmail() {
  try {
    return localStorage.getItem("grolo-pending-email") ?? "";
  } catch {
    return "";
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, updateSettings, refreshLocation } = useBuyerSettings();
  const { user, updateEmail } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: readPendingEmail() || settings.email || "",
    bio: "",
    location: "",
    avatar: "",
    interests: [],
  });
  const [error, setError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleInterest = (interest) => update("interests", form.interests.includes(interest)
    ? form.interests.filter((item) => item !== interest)
    : [...form.interests, interest]);

  const handleProfileContinue = () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.bio.trim()) {
      setError("Please complete your display name, username, and bio.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile pictures must be 5 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("avatar", reader.result);
    reader.onerror = () => setError("We couldn't read that image. Please try again.");
    reader.readAsDataURL(file);
  };

  const finish = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.bio.trim()) {
      setError("Please complete your display name, username, and bio.");
      setStep(1);
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required.");
      setStep(1);
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      setStep(1);
      return;
    }
    try {
      if (user?.email !== form.email.trim()) await updateEmail(form.email.trim());
    } catch (updateError) {
      setError(updateError.message || "We couldn't update your email address.");
      setStep(1);
      return;
    }
    const saved = updateSettings({
      ...form,
      email: form.email.trim(),
      city: form.location.split(",")[0].trim(),
      province: "Alberta",
    });
    if (!saved) {
      setError("We couldn't save your profile. Please try again with a smaller photo.");
      return;
    }
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.removeItem("grolo-pending-email");
    navigate("/", {
      replace: true,
      state: {
        tab: "Your Community",
        communityFilter: "For You",
        refreshFeed: Date.now(),
      },
    });
  };

  return (
    <MobileScreenLayout>
      {step > 0 && <Header title="Set up your profile" hideProfile onBack={() => setStep((current) => current - 1)} />}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-6 py-8">
        {step === 0 && <WelcomeStep onContinue={() => setStep(1)} />}
        {step === 1 && <ProfileStep form={form} update={update} error={error} onContinue={handleProfileContinue} />}
        {step === 2 && <PhotoStep form={form} update={update} handleFile={handleFile} error={error} onContinue={() => { setError(""); setStep(3); }} onSkip={() => { setError(""); setStep(3); }} />}
        {step === 3 && <InterestsStep interests={form.interests} toggleInterest={toggleInterest} onContinue={() => { setError(""); setStep(4); }} />}
        {step === 4 && <LocationPermissionStep onAllow={async () => { await refreshLocation(); setStep(5); }} onNotNow={() => { updateSettings({ locationPermission: "denied" }); setStep(5); }} />}
        {step === 5 && <ReadyStep form={form} onEnter={finish} />}
      </div>
    </MobileScreenLayout>
  );
}

function WelcomeStep({ onContinue }) {
  return <div className="flex min-h-full flex-col items-center justify-center text-center"><img src="/grolo-logo.svg" alt="Grolo" className="mb-8 w-40" /><h1 className="text-[26px] font-semibold">Welcome to Grolo</h1><p className="mt-2 text-[15px] font-medium text-[#498467]">Locally Owned. Community Grown.</p><p className="mt-5 max-w-[310px] text-[14px] leading-[150%] text-[#4F4F4F]">Support local businesses, discover unique products and services, attend community events, and grow meaningful local connections.</p><button type="button" onClick={onContinue} className="mt-8 w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">Continue</button></div>;
}

function ProfileStep({ form, update, error, onContinue }) {
  return <Step title="Let's Create Your Profile"><Field label="Display Name" value={form.displayName} onChange={(value) => update("displayName", value)} placeholder="How should the community know you?" required /><Field label="Username" value={form.username} onChange={(value) => update("username", value.replace(/\s+/g, "").toLowerCase())} placeholder="Choose a username" required /><Field label="Email Address" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="name@email.com" required /><label className="flex flex-col gap-2 text-[14px] font-medium">Bio<textarea value={form.bio} onChange={(event) => update("bio", event.target.value)} rows={4} placeholder="Discovering local makers, businesses, and community moments around Calgary." required className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><div className="rounded-lg bg-[#F5FFF6] p-3 text-[12px] text-[#5D7459]"><div className="font-medium">Preview</div>{form.displayName || form.bio ? <><div className="mt-1 font-semibold">{form.displayName}</div>{form.bio && <p className="mt-1">{form.bio}</p>}</> : <p className="mt-1">Your profile preview will appear here.</p>}</div>{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function PhotoStep({ form, update, handleFile, error, onContinue, onSkip }) {
  return <Step title="Help Your Community Recognize You"><div className="flex flex-col items-center gap-3"><ProfileAvatar profile={{ avatar: form.avatar, name: form.displayName }} size="h-28 w-28" /><label className="cursor-pointer rounded-lg border border-[#498467] px-4 py-2 text-center text-[13px] font-medium text-[#498467]"><input type="file" accept="image/*" onChange={handleFile} className="hidden" />Upload Profile Picture</label></div><Field label="Location (optional)" value={form.location} onChange={(value) => update("location", value)} placeholder="Calgary, Airdrie, Cochrane, or Okotoks" />{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue}>Continue</NextButton><button type="button" onClick={onSkip} className="text-[13px] font-medium text-[#498467]">Skip for Now</button></Step>;
}

function InterestsStep({ interests, toggleInterest, onContinue }) {
  return <Step title="Personalize Your Experience"><p className="text-[13px] text-[#828282]">What interests you? Choose as many as you like.</p><div className="grid grid-cols-2 gap-2">{INTERESTS.map((interest) => <button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`rounded-lg border px-3 py-3 text-left text-[12px] font-medium ${interests.includes(interest) ? "border-[#498467] bg-[#498467] text-white" : "border-[#E0E0E0] bg-white"}`}>{interest}</button>)}</div><NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function LocationPermissionStep({ onAllow, onNotNow }) {
  return <Step title="Help Us Personalize Your Community"><p className="text-[14px] leading-[150%] text-[#4F4F4F]">Allow Grolo to access your location to discover nearby businesses, events, products, services, and community activity.</p><div className="rounded-lg bg-[#F5FFF6] p-4 text-[13px] text-[#355F45]">Grolo only uses your location to improve local discovery. We never publicly display your exact location.</div><NextButton onClick={onAllow}>Allow Location Access</NextButton><button type="button" onClick={onNotNow} className="text-[13px] font-medium text-[#498467]">Not Now</button></Step>;
}

function ReadyStep({ form, onEnter }) {
  return <Step title="You're Ready to Grow Local"><p className="text-center text-[14px] text-[#4F4F4F]">Your Grolo profile is ready.</p><div className="rounded-lg bg-[#F5FFF6] p-4 text-[14px] text-[#355F45]"><div>✓ Profile Created</div><div>✓ Interests Selected</div><div>✓ Community Access Unlocked</div></div><div className="flex items-center gap-3"><ProfileAvatar profile={{ avatar: form.avatar, name: form.displayName }} size="h-14 w-14" /><div><div className="font-semibold">{form.displayName}</div><div className="text-[12px] text-[#828282]">@{form.username}</div></div></div><NextButton onClick={onEnter}>Enter Grolo</NextButton></Step>;
}

function Step({ title, children }) { return <div className="mx-auto flex max-w-[390px] flex-col gap-5"><div><div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-[#498467]">Grolo setup</div><h1 className="text-[24px] font-semibold">{title}</h1></div>{children}</div>; }
function Field({ label, value, onChange, placeholder, required = false }) { return <label className="flex flex-col gap-2 text-[14px] font-medium">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label>; }
function NextButton({ onClick, children }) { return <button type="button" onClick={onClick} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">{children}</button>; }
function ErrorMessage({ children }) { return <p role="alert" className="text-[12px] text-red-600">{children}</p>; }
