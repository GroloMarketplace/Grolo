import { Check, ChevronDown, Store, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useSellerSettings } from "../context/SellerSettingsContext";

export default function ProfileSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileMode, setProfileMode, canSeller } = useProfileMode();
  const { settings: buyerSettings } = useBuyerSettings();
  const { getSellerProfile } = useSellerSettings();
  const [open, setOpen] = useState(false);
  const isBuyerPath = location.pathname === "/profile" || location.pathname === "/buyer-profile";
  const isSeller = !isBuyerPath && (profileMode === "seller" || location.pathname === "/shop" || location.pathname === "/seller-profile");
  const storeName = getSellerProfile("current-user").name?.trim();
  const username = buyerSettings.username?.trim() || buyerSettings.displayName?.trim() || storeName || "Your Profile";
  const ModeIcon = isSeller ? Store : UserRound;

  const switchProfile = (mode) => {
    setProfileMode(mode);
    setOpen(false);
    navigate(mode === "buyer" ? "/profile" : "/shop");
  };

  return (
    <div className="relative inline-flex min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-w-0 max-w-full items-center justify-center gap-1.5 text-[20px] font-semibold tracking-[-0.4px] text-[#1F2D27]"
        aria-label={`Switch profile mode, currently ${isSeller ? "Seller" : "Buyer"}`}
        aria-expanded={open}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isSeller ? "bg-[#E4F1E7] text-[#2F7658]" : "bg-[#F1F5F2] text-[#498467]"}`}>
          <ModeIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 truncate">{username}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-[#498467] transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-10 z-50 min-w-[210px] -translate-x-1/2 rounded-2xl border border-[#DCEBE0] bg-white p-2 text-left shadow-[0_8px_24px_rgba(31,90,69,0.14)]">
          <ProfileOption icon={UserRound} active={!isSeller} label="Buyer Profile" onClick={() => switchProfile("buyer")} />
          {canSeller && <ProfileOption icon={Store} active={isSeller} label="Seller Profile" onClick={() => switchProfile("seller")} />}
        </div>
      )}
    </div>
  );
}

function ProfileOption({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${active ? "bg-[#F1F8F2] font-semibold text-[#2F7658]" : "text-[#4F5F56] hover:bg-[#F7FBF8]"}`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-white text-[#498467]" : "bg-[#F5F8F5] text-[#789083]"}`}>
        <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="flex-1">{label}</span>
      {active && <Check aria-hidden="true" className="h-4 w-4 text-[#498467]" strokeWidth={2.5} />}
    </button>
  );
}
