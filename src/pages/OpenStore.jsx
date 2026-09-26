import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useProfileMode } from "../context/ProfileModeContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useFoundingMember } from "../context/FoundingMemberContext";
import { useActivity } from "../context/ActivityContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useAuth } from "../context/AuthContext";
import { uploadImage, removeImage } from "../lib/imageStorage";
import { normalizeWebsite, validateSellerProfile } from "../utils/validation";
import LocationAutocomplete from "../components/LocationAutocomplete";
import { formatLocation, friendlyLocation } from "../data/locations";

const SELLER_ID = "current-user";
const DRAFT_KEY = "grolo-open-store-draft";
const STORE_CATEGORIES = [
  "Garden & Produce", "Bakery & Sweets", "Meal Prep & Catering", "Crafts & Handmade",
  "Services", "Workshops & Classes", "Specialty Foods", "Art & Design", "Plants & Flowers",
  "Health & Wellness", "Home & Décor", "Clothing & Accessories", "Vintage & Collectibles",
  "Pet Products", "Books & Stationery", "Other",
];

const emptyForm = {
  name: "", description: "", location: "", locationDetails: null, category: "", avatar: "", banner: "",
  instagram: "", facebook: "", x: "", website: "", phone: "", email: "",
};

function readDraft(storageKey, profile, buyerAvatar) {
  const defaultAvatar = buyerAvatar || profile.avatar;
  const defaultBanner = profile.banner;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return {
      step: Number.isInteger(saved?.step) ? saved.step : 0,
      form: { ...emptyForm, ...(saved?.form ?? {}), avatar: saved?.form?.avatar || defaultAvatar, banner: saved?.form?.banner || defaultBanner },
    };
  } catch {
    return { step: 0, form: { ...emptyForm, avatar: defaultAvatar, banner: defaultBanner } };
  }
}

export default function OpenStore() {
  const navigate = useNavigate();
  const { activateStore, storeActive } = useProfileMode();
  const { getSellerProfile, refreshSellerProfile, updateSellerProfile } = useSellerSettings();
  const { awardFoundingMember } = useFoundingMember();
  const { recordActivity } = useActivity();
  const { settings: buyerSettings } = useBuyerSettings();
  const { user } = useAuth();
  const storageKey = `${DRAFT_KEY}-${user?.id ?? "anonymous"}`;
  const profile = getSellerProfile(SELLER_ID);
  const initial = readDraft(storageKey, profile, buyerSettings.avatar);
  const [step, setStep] = useState(initial.step);
  const [form, setForm] = useState(initial.form);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    if (!storeActive) return;
    try { localStorage.removeItem(storageKey); } catch { /* Ignore storage cleanup failures. */ }
    navigate("/shop", { replace: true });
  }, [navigate, storageKey, storeActive]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ step, form }));
    } catch {
      setFormError("Your progress could not be saved. Try smaller images or continue without uploads.");
    }
  }, [form, step]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const next = () => { setFormError(""); setStep((current) => current + 1); };
  const back = () => { setFormError(""); setStep((current) => Math.max(0, current - 1)); };

  const handleFile = async (event, key) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isBanner = key === "banner";
    setUploadError("");
    setUploadWarning("");
    setUploadProgress({ progress: 0, stage: "Preparing image", kind: key });
    try {
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(previewUrl);
        if (isBanner) {
          const ratio = image.width / image.height;
          const warnings = [];
          if (image.width < 1500 || image.height < 500) warnings.push("For best quality, use at least 1500 × 500 px.");
          if (Math.abs(ratio - 3) / 3 > 0.2) warnings.push("This image may be cropped to fit the 3:1 banner ratio.");
          setUploadWarning(warnings.join(" "));
        } else if (image.width < 800 || image.height < 800) {
          setUploadWarning("For a sharp profile picture, use at least 800 × 800 px.");
        }
      };
      image.onerror = () => URL.revokeObjectURL(previewUrl);
      image.src = previewUrl;
      const { url } = await uploadImage(file, { userId: user.id, kind: isBanner ? "banner" : "avatar", onProgress: setUploadProgress });
      update(key, url);
      setUploadProgress(null);
    } catch (error) {
      setUploadProgress(null);
      setUploadError(error.message || "We couldn't upload that image. Please try again.");
    }
  };

  const launch = async () => {
    const normalizedForm = { ...form, website: normalizeWebsite(form.website) };
    const validationError = validateSellerProfile(normalizedForm);
    if (validationError || !normalizedForm.category) {
      setFormError(validationError ?? "Choose a store category before launching.");
      setStep(!normalizedForm.name.trim() || !normalizedForm.description.trim() || !normalizedForm.location.trim() ? 1 : !normalizedForm.category ? 3 : 4);
      return;
    }
    if (uploadError) return;
    const socialLinks = [normalizedForm.instagram, normalizedForm.facebook, normalizedForm.x, normalizedForm.website].filter(Boolean).join(" | ");
    const previousAvatar = profile.avatar;
    const previousBanner = profile.banner;
    const location = form.locationDetails ?? {};
    try {
      await updateSellerProfile(SELLER_ID, { ...normalizedForm, location: formatLocation(location) || normalizedForm.location, neighborhood: location.neighborhood, city: location.city, province: location.province, country: location.country, postalCode: location.postalCode, latitude: location.latitude, longitude: location.longitude, socialLinks });
      if (previousAvatar && previousAvatar !== form.avatar) await removeImage(previousAvatar, user.id).catch((error) => console.error("Unable to remove previous avatar", error));
      if (previousBanner && previousBanner !== form.banner) await removeImage(previousBanner, user.id).catch((error) => console.error("Unable to remove previous banner", error));
      const activation = await activateStore();
      if (user?.id && activation?.openedAt) {
        await awardFoundingMember(user.id, activation.openedAt);
        recordActivity({ id: `store-created:${user.id}`, type: "Store creation", label: `Created store: ${normalizedForm.name}`, entityId: user.id });
      }
      await refreshSellerProfile();
      try { localStorage.removeItem(storageKey); } catch { /* Ignore storage cleanup failures. */ }
      navigate("/shop", { replace: true });
    } catch (error) {
      setFormError(error.message || "Your store could not be saved.");
    }
  };

  return (
    <MobileScreenLayout>
      {step > 0 && <Header title="Open a Store" onBack={back} />}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 py-6">
        <div className="mx-auto flex w-full max-w-full flex-col gap-5 pb-6">
          <Progress step={step} />
          {step === 0 && <WelcomeStep onContinue={next} />}
          {step === 1 && <BasicsStep form={form} update={update} onContinue={next} error={formError} />}
          {step === 2 && <BrandingStep form={form} handleFile={handleFile} uploadProgress={uploadProgress} onContinue={next} error={uploadError || formError} warning={uploadWarning} />}
          {step === 3 && <CategoryStep value={form.category} update={update} onContinue={next} error={formError} />}
          {step === 4 && <ContactStep form={form} update={update} onContinue={next} error={formError} />}
          {step === 5 && <ReviewStep form={form} onEdit={(targetStep) => { setFormError(""); setStep(targetStep); }} onContinue={next} />}
          {step === 6 && <LaunchStep form={form} onLaunch={launch} error={formError} />}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function Progress({ step }) {
  return <div className="flex items-center justify-between text-[11px] font-medium text-[#828282]"><span>Store setup</span><span>Step {step + 1} of 7</span><div className="absolute left-5 right-5 mt-8 h-1 rounded-full bg-[#E6E6E6]"><div className="h-full rounded-full bg-[#498467] transition-all" style={{ width: `${((step + 1) / 7) * 100}%` }} /></div></div>;
}

function WelcomeStep({ onContinue }) {
  return <Step title="Open Your Store" subtitle="Share what makes your business unique with your local community."><p>Whether you're selling produce, baked goods, handmade products, services, meal prep, workshops, or something entirely unique, Grolo helps people discover and support local businesses.</p><BenefitList /><NextButton onClick={onContinue}>Let's Get Started</NextButton></Step>;
}

function BasicsStep({ form, update, onContinue, error }) {
  return <Step title="Tell Us About Your Store"><Field label="Store Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your store name" required /><label className="flex flex-col gap-2 text-[14px] font-medium">Store Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={5} placeholder="Tell your community what makes your store special." className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><LocationAutocomplete label="Store Location" value={form.location} location={form.locationDetails} onChange={(value) => { update("locationDetails", value); update("location", friendlyLocation(value)); }} required /><PreviewCard title={form.name || "Your Store"} text={form.description || "Your store description will appear here."} /><ErrorMessage>{error}</ErrorMessage><NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function BrandingStep({ form, handleFile, uploadProgress, onContinue, error, warning }) {
  return <Step title="Make Your Store Stand Out"><p>Use a personal photo, store photo, farm photo, product photo, or logo.</p><div className="flex flex-col items-center gap-2"><img src={form.avatar} alt="Profile preview" className="h-28 w-28 rounded-full object-cover" /><div className="text-center text-[11px] text-[#828282]">Recommended: 800 × 800 px<br />Automatically optimized · Up to 10 MB source<br />JPG, PNG, WEBP</div><FileButton label="Upload Profile Picture" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event, "avatar")} />{uploadProgress?.kind === "avatar" && <UploadProgress {...uploadProgress} />}</div><div className="flex flex-col gap-2"><img src={form.banner} alt="Store banner preview" className="h-24 w-full rounded-lg object-cover" /><div className="text-[11px] leading-[140%] text-[#828282]">Recommended Banner Size<br /><span className="font-medium text-[#4F4F4F]">1500 × 500 px</span><br />Maximum Size: 5 MB<br />JPG, PNG, WEBP<br />Choose a wide image that represents your business.</div><FileButton label="Upload Store Banner" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event, "banner")} />{uploadProgress?.kind === "banner" && <UploadProgress {...uploadProgress} />}</div>{warning && <p className="text-[12px] text-amber-700">{warning}</p>}<ErrorMessage>{error}</ErrorMessage><NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function CategoryStep({ value, update, onContinue, error }) {
  return <Step title="What Best Describes Your Store?"><p>Choose the category that best represents your business.</p><label className="flex flex-col gap-2 text-[14px] font-medium">Primary Store Category<select required value={value} onChange={(event) => update("category", event.target.value)} className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-3 outline-none focus:border-[#498467]"><option value="">Select primary store category</option>{STORE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><NextButton onClick={onContinue}>Continue</NextButton>{error && <ErrorMessage>{error}</ErrorMessage>}</Step>;
}

function ContactStep({ form, update, onContinue, error }) {
  return <Step title="Help Customers Find You"><p>These details are optional and can always be added or updated later.</p><Field label="Instagram" value={form.instagram} onChange={(value) => update("instagram", value)} placeholder="@yourbusiness" /><Field label="Facebook" value={form.facebook} onChange={(value) => update("facebook", value)} placeholder="Facebook page" /><Field label="X" value={form.x} onChange={(value) => update("x", value)} placeholder="@yourbusiness" /><Field label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://" /><Field label="Phone Number" value={form.phone} onChange={(value) => update("phone", value)} placeholder="Optional" /><Field label="Business Email" value={form.email} onChange={(value) => update("email", value)} placeholder="Optional" type="email" />{error && <ErrorMessage>{error}</ErrorMessage>}<NextButton onClick={onContinue}>Review Store</NextButton></Step>;
}

function ReviewStep({ form, onEdit, onContinue }) {
  return <Step title="Review Your Store"><div className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm"><img src={form.banner} alt="Store banner" className="h-28 w-full object-cover" /><div className="p-4"><div className="flex items-center gap-3"><img src={form.avatar} alt={form.name} className="h-16 w-16 rounded-full object-cover" /><div><h2 className="text-[19px] font-semibold">{form.name || "Your Store"}</h2><p className="text-[12px] text-[#828282]">{form.category || "Category not selected"}</p></div></div><p className="mt-3 text-[13px]">{form.description || "Your description will appear here."}</p><p className="mt-2 text-[12px] text-[#828282]">{form.location || "Location not added"}</p></div></div><div className="flex flex-col gap-2 text-[13px]"><ReviewRow label="Profile Picture" value={form.avatar ? "Added" : "Not added"} onEdit={() => onEdit(2)} /><ReviewRow label="Store Basics" value={form.name || "Not complete"} onEdit={() => onEdit(1)} /><ReviewRow label="Category" value={form.category || "Not selected"} onEdit={() => onEdit(3)} /><ReviewRow label="Social Links" value={[form.instagram, form.facebook, form.x, form.website].filter(Boolean).length ? "Added" : "Optional"} onEdit={() => onEdit(4)} /></div><NextButton onClick={onContinue}>Continue</NextButton></Step>;
}

function LaunchStep({ form, onLaunch, error }) {
  return <Step title="You're Ready to Grow Local"><p className="text-center">Your store is ready to join the community.</p><div className="rounded-lg bg-[#F5FFF6] p-4 text-[14px] text-[#355F45]"><div>✓ Store Created</div><div>✓ Seller Profile Activated</div><div>✓ Ready to Create Listings</div><div>✓ Ready to Receive Orders</div></div><PreviewCard title={form.name || "Your Store"} text={form.category || "Your category"} /><ErrorMessage>{error}</ErrorMessage><NextButton onClick={onLaunch}>Launch My Store</NextButton></Step>;
}

function Step({ title, subtitle, children }) { return <div className="flex flex-col gap-5"><div><div className="mb-1 text-[12px] font-medium uppercase tracking-wide text-[#498467]">Selling on Grolo</div><h1 className="text-[24px] font-semibold">{title}</h1>{subtitle && <p className="mt-2 text-[14px] text-[#4F4F4F]">{subtitle}</p>}</div>{children}</div>; }
function Field({ label, value, onChange, placeholder, required = false, type = "text" }) { return <label className="flex flex-col gap-2 text-[14px] font-medium">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label>; }
function FileButton({ label, accept, onChange }) { return <label className="cursor-pointer rounded-lg border border-[#498467] px-4 py-2 text-center text-[13px] font-medium text-[#498467]"><input type="file" accept={accept} onChange={onChange} className="hidden" />{label}</label>; }
function NextButton({ onClick, children }) { return <button type="button" onClick={onClick} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">{children}</button>; }
function ErrorMessage({ children }) { return children ? <p role="alert" className="text-[12px] text-red-600">{children}</p> : null; }
function UploadProgress({ progress, stage }) { return <div className="w-full max-w-[240px] text-center text-[11px] text-[#687368]"><div className="mb-1 h-1.5 overflow-hidden rounded-full bg-[#E6E6E6]"><div className="h-full rounded-full bg-[#498467] transition-all" style={{ width: `${progress}%` }} /></div>{stage}</div>; }
function PreviewCard({ title, text }) { return <div className="rounded-lg bg-[#F5FFF6] p-3 text-[13px]"><div className="font-semibold text-[#355F45]">{title}</div><div className="mt-1 text-[#5D7459]">{text}</div></div>; }
function BenefitList() { return <div className="rounded-lg bg-[#F5FFF6] p-4 text-[14px] text-[#355F45]"><div>✓ Create listings</div><div>✓ Sell products and services</div><div>✓ Receive orders</div><div>✓ Build followers</div><div>✓ Participate in community events</div><div>✓ Earn Grolo status and trust</div></div>; }
function ReviewRow({ label, value, onEdit }) { return <div className="flex items-center justify-between rounded-lg border border-[#E0E0E0] px-3 py-2"><div><span className="font-medium">{label}</span><span className="ml-2 text-[#828282]">{value}</span></div><button type="button" onClick={onEdit} className="text-[12px] font-medium text-[#498467]">Edit</button></div>; }
