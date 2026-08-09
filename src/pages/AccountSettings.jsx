import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MobileScreenLayout from "../components/MobileScreenLayout";
import OutlineIcon from "../components/OutlineIcon";
import { useOrders } from "../context/OrderContext";
import { usePaymentMethods } from "../context/PaymentMethodsContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useSidebar } from "../hooks/useSidebar";
import { getBuyerStatus, getSellerStatus, mockBuyerActions } from "../data/communityStatus";
import { products, sellers } from "../data/mockData";
import { useFoundingMember } from "../context/FoundingMemberContext";
import FoundingMemberBadge from "../components/FoundingMemberBadge";
import InteractiveStatusBadge from "../components/InteractiveStatusBadge";
import { useFollow } from "../context/FollowContext";

const SELLER_ID = "sarahs-backyard";
const seller = sellers[SELLER_ID];
const defaultDescription = "Tell customers about your store, what you sell, and what makes it special.";

export default function AccountSettings() {
  const { profileMode } = useProfileMode();
  return profileMode === "buyer" ? <BuyerAccountSettings /> : <SellerAccountSettings />;
}

function SellerAccountSettings() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { sellerOrders } = useOrders();
  const { getFollowerCount } = useFollow();
  const { getPaymentMethods, updatePaymentMethods, updateFulfillment } = usePaymentMethods();
  const { getSellerProfile, updateSellerProfile } = useSellerSettings();
  const profile = getSellerProfile(SELLER_ID);
  const paymentSettings = getPaymentMethods(SELLER_ID);
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description || "");
  const [location, setLocation] = useState(profile.location || "");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [banner, setBanner] = useState(profile.banner);
  const [methods, setMethods] = useState(paymentSettings.methods);
  const [eTransferEmail, setETransferEmail] = useState(paymentSettings.eTransferEmail);
  const [fulfillmentMethods, setFulfillmentMethods] = useState(paymentSettings.fulfillmentMethods);
  const [pickupLocation, setPickupLocation] = useState(paymentSettings.pickupLocation);
  const [pickupNotes, setPickupNotes] = useState(paymentSettings.pickupNotes);
  const [deliveryRadius, setDeliveryRadius] = useState(paymentSettings.deliveryRadius);
  const [deliveryFee, setDeliveryFee] = useState(paymentSettings.deliveryFee);
  const [notifications, setNotifications] = useState(profile.notifications);
  const [vacationMode, setVacationMode] = useState(profile.vacationMode ?? false);
  const [vacationMessage, setVacationMessage] = useState(profile.vacationMessage ?? "");
  const [returnDate, setReturnDate] = useState(profile.returnDate ?? "");
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const orders = sellerOrders(SELLER_ID);
  const sellerStatus = getSellerStatus({
    listingsCreated: products.filter((product) => product.sellerId === SELLER_ID).length,
    completedOrders: orders.filter((order) => order.status === "Completed").length,
    followers: getFollowerCount(SELLER_ID),
    sellerReviews: 0,
    marketplaceInteractions: 0,
    activeDays: 0,
    averageRating: seller.rating,
    communityContribution: 0,
  });
  const { getFoundingMember } = useFoundingMember();
  const foundingMember = getFoundingMember(SELLER_ID);
  const snapshot = {
    followers: getFollowerCount(SELLER_ID),
    listings: products.filter((product) => product.sellerId === SELLER_ID).length,
    rating: seller.rating,
    productsSold: orders.reduce((total, order) => total + order.quantity, 0) || 23,
  };

  const toggleValue = (values, value) => values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

  const handleFile = (event, setValue, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isBanner = kind === "banner";
    setUploadError("");
    setUploadWarning("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > (isBanner ? 5 : 3) * 1024 * 1024) {
      setUploadError(`This image must be ${isBanner ? 5 : 3} MB or smaller.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue(reader.result);
      const image = new Image();
      image.onload = () => {
        if (isBanner) {
          const warnings = [];
          if (image.width < 1500 || image.height < 500) warnings.push("For best quality, use at least 1500 × 500 px.");
          if (Math.abs((image.width / image.height) - 3) / 3 > 0.2) warnings.push("This image may be cropped to fit the 3:1 banner ratio.");
          setUploadWarning(warnings.join(" "));
        } else if (image.width < 800 || image.height < 800) {
          setUploadWarning("For a sharp profile picture, use at least 800 × 800 px.");
        }
      };
      image.src = reader.result;
    };
    reader.onerror = () => setUploadError("We couldn't read that image. Please try again.");
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (uploadError) return;
    const profileSaved = updateSellerProfile(SELLER_ID, {
      name,
      description,
      location,
      avatar,
      banner,
      notifications,
      vacationMode,
      vacationMessage,
      returnDate,
    });
    if (!profileSaved) {
      setUploadError("Your profile image could not be saved. Please try a smaller image.");
      return;
    }
    updatePaymentMethods(SELLER_ID, methods, eTransferEmail);
    updateFulfillment(SELLER_ID, fulfillmentMethods, deliveryFee, deliveryRadius, pickupLocation, pickupNotes);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <>
      <MobileScreenLayout>
        <Header
          title="Account Settings"
          onBack={() => routeLocation.state?.fromSellerMenu
            ? navigate("/shop", { state: { openSellerMenu: true } })
            : navigate(-1)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5">
          <div className="flex flex-col gap-5 pb-6">
            <Section title="Store Profile">
              <div className="flex items-center gap-4">
                <img src={avatar} alt={name} className="h-20 w-20 rounded-full object-cover" />
                <div className="flex flex-col gap-2">
                  <span className="text-[14px] font-medium">Profile Picture</span>
                  <div className="text-[11px] leading-[140%] text-[#828282]">Recommended: 800 × 800 px<br />Maximum Size: 3 MB<br />JPG, PNG, WEBP</div><FileButton label="Change Profile Picture" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event, setAvatar, "avatar")} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <img src={banner} alt="Store banner" className="h-20 flex-1 rounded-lg object-cover" />
                <div className="flex flex-col items-start gap-2"><div className="text-[11px] leading-[140%] text-[#828282]">Recommended Banner Size<br /><span className="font-medium text-[#4F4F4F]">1500 × 500 px</span><br />Maximum Size: 5 MB<br />JPG, PNG, WEBP<br />Choose a wide image that represents your business.</div><FileButton label="Upload / Change Store Banner" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event, setBanner, "banner")} /></div>
              </div>
              {uploadWarning && <p className="mt-3 text-[12px] text-amber-700">{uploadWarning}</p>}
              {uploadError && <p role="alert" className="mt-3 text-[12px] text-red-600">{uploadError}</p>}
            </Section>

            <Section title="Store Information">
              <Field label="Shop Name" value={name} onChange={setName} />
              <label className="flex flex-col gap-2 text-[14px] font-medium">
                Store Description
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={defaultDescription} rows={4} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" />
              </label>
              <Field label="Neighbourhood" value={location} onChange={setLocation} />
            </Section>

            <Section title="Seller Status">
              <div className="flex items-center gap-3 rounded-lg bg-[#F5FFF6] p-3">
                <InteractiveStatusBadge status={sellerStatus} className="mt-0 text-[14px]" />
                <div><div className="text-[12px] text-[#828282]">Read-only seller status</div></div>
                <button type="button" onClick={() => navigate("/profit")} className="ml-auto text-[12px] font-medium text-[#498467]">View Progress <span aria-hidden="true">›</span></button>
              </div>
            </Section>



            {foundingMember && <Section title="Founder Benefits">
              <div className="rounded-lg border border-[#E7C66A] bg-[#FFF8DD] p-3">
                <FoundingMemberBadge sellerId={SELLER_ID} />
                <div className="mt-2 text-[13px] font-medium text-[#5F4A00]">Member #{foundingMember.registrationNumber} of 100</div>
                <div className="mt-2 text-[12px] font-medium text-[#5F4A00]">Benefits</div>
                <div className="mt-1 flex flex-col gap-1 text-[12px] text-[#6F5B1A]">
                  <div>✓ 6 Months Complimentary Community Spotlight Advertising</div>
                  <div className="pl-4 text-[11px] text-[#806D2A]">Expires: {foundingMember.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                  <div>✓ Priority Placement in Featured Listings</div>
                  <div>✓ Exclusive Founder Memorabilia</div>
                  <div>✓ Lifetime Founding Member Status</div>
                </div>
              </div>
            </Section>}

            <Section title="Vacation Mode">
              <div className="flex items-center justify-between rounded-lg bg-[#F5FFF6] p-3"><div><div className="text-[14px] font-medium">Vacation Mode</div><div className="text-[12px] text-[#828282]">Pause new orders while keeping your store visible</div></div><button type="button" role="switch" aria-checked={vacationMode} onClick={() => setVacationMode((current) => !current)} className={`relative h-7 w-12 rounded-full transition-colors ${vacationMode ? "bg-[#498467]" : "bg-[#D9D9D9]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${vacationMode ? "translate-x-6" : "translate-x-1"}`} /></button></div>
              {vacationMode && <><label className="flex flex-col gap-2 text-[14px] font-medium">Vacation Message<textarea value={vacationMessage} onChange={(event) => setVacationMessage(event.target.value)} placeholder="Let customers know when you'll be back or how they can reach you." rows={4} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label><Field label="Return Date" type="date" value={returnDate} onChange={setReturnDate} /></>}
            </Section>

            <Section title="Payment Methods">
              <Checkbox label="Cash" checked={methods.includes("cash")} onChange={() => setMethods(toggleValue(methods, "cash"))} />
              <Checkbox label="E-Transfer" checked={methods.includes("etransfer")} onChange={() => setMethods(toggleValue(methods, "etransfer"))} />
              {methods.includes("etransfer") && <Field label="E-Transfer Email" type="email" value={eTransferEmail} onChange={setETransferEmail} />}
              <div className="text-[13px] text-[#828282]">Credit/Debit Coming Soon</div>
            </Section>

            <Section title="Fulfillment Settings">
              <Checkbox label="Pickup" checked={fulfillmentMethods.includes("pickup")} onChange={() => setFulfillmentMethods(toggleValue(fulfillmentMethods, "pickup"))} />
              {fulfillmentMethods.includes("pickup") && <><Field label="Pickup Address" value={pickupLocation} onChange={setPickupLocation} /><Field label="Pickup Notes" value={pickupNotes} placeholder="Example: Text when arriving, booth #12, ring side doorbell." onChange={setPickupNotes} /></>}
              <Checkbox label="Delivery" checked={fulfillmentMethods.includes("delivery")} onChange={() => setFulfillmentMethods(toggleValue(fulfillmentMethods, "delivery"))} />
              {fulfillmentMethods.includes("delivery") && <div className="grid grid-cols-2 gap-3"><Field label="Delivery Radius" type="number" suffix="km" value={deliveryRadius} onChange={setDeliveryRadius} /><Field label="Delivery Fee" type="number" prefix="$" step="0.01" value={deliveryFee} onChange={setDeliveryFee} /></div>}
            </Section>

            <Section title="Store Snapshot">
              <div className="grid grid-cols-2 gap-3">{[["Followers", snapshot.followers], ["Listings", snapshot.listings], ["Average Rating", snapshot.rating], ["Products Sold", snapshot.productsSold]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#F5FFF6] p-3"><div className="text-[20px] font-semibold text-[#498467]">{value}</div><div className="text-[12px] text-[#828282]">{label}</div></div>)}</div>
            </Section>

            <Section title="Notifications">
              {[["newOrders", "New Orders"], ["newMessages", "New Messages"], ["newFollowers", "New Followers"], ["reviews", "Reviews"], ["eventInteractions", "Event Interactions"]].map(([key, label]) => <Checkbox key={key} label={label} checked={notifications[key]} onChange={() => setNotifications((current) => ({ ...current, [key]: !current[key] }))} />)}
            </Section>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleSave} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">Save Changes</button>
              {saved && <p className="text-center text-[13px] font-medium text-[#498467]">Settings saved</p>}
            </div>
          </div>
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}

function BuyerAccountSettings() {
  const navigate = useNavigate();
  const { canSeller } = useProfileMode();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const { settings, updateSettings } = useBuyerSettings();
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [bio, setBio] = useState(settings.bio);
  const [location, setLocation] = useState(settings.location);
  const [avatar, setAvatar] = useState(settings.avatar);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [showLocationPublicly, setShowLocationPublicly] = useState(settings.showLocationPublicly);
  const [saved, setSaved] = useState(false);
  const status = getBuyerStatus(mockBuyerActions);

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateSettings({ displayName, bio, location, avatar, notifications, showLocationPublicly });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <>
      <MobileScreenLayout>
        <Header title="Account Settings" onBack={() => navigate(-1)} />
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-5">
          <div className="flex flex-col gap-5 pb-6">
            <Section title="Profile">
              <div className="flex items-center gap-4">
                <img src={avatar} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
                <div className="flex flex-col gap-2"><span className="text-[14px] font-medium">Profile Picture</span><FileButton label="Change Profile Picture" accept="image/*" onChange={handleFile} /></div>
              </div>
            </Section>

            <Section title="Basic Information">
              <Field label="Display Name" value={displayName} onChange={setDisplayName} />
              <label className="flex flex-col gap-2 text-[14px] font-medium">Bio (optional)<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} className="resize-none rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467]" /></label>
              <Field label="Location (optional)" value={location} placeholder="Optional" onChange={setLocation} />
            </Section>

            {!canSeller && <Section title="Sell with Grolo">
              <div className="rounded-lg bg-[#F5FFF6] p-4">
                <div className="text-[14px] font-medium">Ready to share what you do?</div>
                <div className="mt-1 text-[12px] text-[#828282]">Open a store to unlock your seller profile, listings, orders, and dashboard.</div>
                <button type="button" onClick={() => navigate("/open-store")} className="mt-3 rounded-lg bg-[#498467] px-4 py-2 text-[13px] font-medium text-white">Open a Store</button>
              </div>
            </Section>}

            <Section title="Buyer Status">
              <div className="flex items-center gap-3 rounded-lg bg-[#F5FFF6] p-3">
                <span className="text-[#498467]"><OutlineIcon name={status.icon} size={25} /></span>
                <div><div className="text-[12px] font-medium text-[#498467]">Buyer Status</div><div className="text-[15px] font-semibold">{status.name}</div></div>
                <button type="button" onClick={() => navigate("/community-impact")} className="ml-auto text-[12px] font-medium text-[#498467]">View Progress <span aria-hidden="true">›</span></button>
              </div>
            </Section>

            <Section title="Profile Snapshot">
              <div className="grid grid-cols-2 gap-3">{[["Businesses Supported", mockBuyerActions.businessesSupported], ["Reviews Written", mockBuyerActions.reviewsWritten], ["Events Attended", mockBuyerActions.eventsAttended], ["Completed Trades", mockBuyerActions.tradesCompleted]].map(([label, value]) => <div key={label} className="rounded-lg bg-[#F5FFF6] p-3"><div className="text-[20px] font-semibold text-[#498467]">{value}</div><div className="text-[12px] text-[#828282]">{label}</div></div>)}</div>
            </Section>

            <Section title="Notification Settings">
              {[['newMessages', 'New Messages'], ['newFollowers', 'New Followers'], ['productUpdates', 'Product Updates'], ['eventUpdates', 'Event Updates'], ['tradeRequests', 'Trade Requests'], ['orderUpdates', 'Order Updates'], ['communityActivity', 'Community Activity']].map(([key, label]) => <Checkbox key={key} label={label} checked={notifications[key]} onChange={() => setNotifications((current) => ({ ...current, [key]: !current[key] }))} />)}
            </Section>

            <Section title="Privacy">
              <Checkbox label="Show Location Publicly" checked={showLocationPublicly} onChange={() => setShowLocationPublicly((current) => !current)} />
            </Section>

            <div className="flex flex-col gap-2"><button type="button" onClick={handleSave} className="w-full rounded-lg bg-[#498467] py-3 text-[16px] font-medium text-white">Save Changes</button>{saved && <p className="text-center text-[13px] font-medium text-[#498467]">Settings saved</p>}</div>
          </div>
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} mode="buyer" />
    </>
  );
}

function Section({ title, children }) {
  return <section className="rounded-lg border border-[#E0E0E0] bg-white p-4"><h2 className="mb-4 text-[17px] font-semibold">{title}</h2><div className="flex flex-col gap-4">{children}</div></section>;
}

function Field({ label, value, onChange, type = "text", placeholder, prefix, suffix, step }) {
  return <label className="flex flex-col gap-2 text-[14px] font-medium">{label}<div className="relative"><span className={prefix ? "absolute left-3 top-1/2 -translate-y-1/2 text-[#828282]" : "hidden"}>{prefix}</span><input type={type} value={value} onChange={(event) => onChange(type === "number" ? event.target.value : event.target.value)} placeholder={placeholder} step={step} className={`w-full rounded-lg border border-[#E0E0E0] px-3 py-3 text-[14px] font-normal outline-none focus:border-[#498467] ${prefix ? "pl-7" : ""} ${suffix ? "pr-10" : ""}`} />{suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#828282]">{suffix}</span>}</div></label>;
}

function Checkbox({ label, checked, onChange }) {
  return <label className="flex items-center gap-3 text-[14px] font-medium"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#498467]" />{label}</label>;
}

function FileButton({ label, accept, onChange }) {
  return <label className="inline-flex cursor-pointer rounded-lg border border-[#498467] px-3 py-2 text-center text-[12px] font-medium text-[#498467]"><input type="file" accept={accept} onChange={onChange} className="hidden" />{label}</label>;
}
