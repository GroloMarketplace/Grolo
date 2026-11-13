import { ChevronLeft, Menu, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useSellerSettings } from "../context/SellerSettingsContext";
import { useAuthPrompt } from "../context/AuthPromptContext";

const ACTION_CLASS = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6ECE8] bg-[#F8FAF8] text-[#1F5A45] shadow-[0_2px_8px_rgba(31,90,69,0.08)] transition-colors hover:bg-[#EEF5F0] active:bg-[#E5F0E8]";

function HeaderAction({ label, onClick, children, className = "" }) {
  return <button type="button" onClick={onClick} aria-label={label} className={`${ACTION_CLASS} ${className}`}>{children}</button>;
}

export default function Header({ title, titleContent, onBack, onMenu, right, postButton, shareButton, hideProfile = false }) {
  const navigate = useNavigate();
  const { settings: buyerSettings } = useBuyerSettings();
  const { profileMode } = useProfileMode();
  const { getSellerProfile } = useSellerSettings();
  const { requireAuth } = useAuthPrompt();
  const avatar = profileMode === "seller" ? getSellerProfile("current-user").avatar : buyerSettings.avatar;
  const leftAction = onBack
    ? <HeaderAction label="Back" onClick={onBack}><ChevronLeft className="h-5 w-5" strokeWidth={2.2} /></HeaderAction>
    : onMenu
      ? <HeaderAction label="Menu" onClick={onMenu}><Menu className="h-5 w-5" strokeWidth={2.1} /></HeaderAction>
      : <span className="h-10 w-10 shrink-0" aria-hidden="true" />;

  return (
    <header className="grid h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#E6ECE8] bg-white px-4">
      <div>{leftAction}</div>
      {(title || titleContent) && <div className={`min-w-0 whitespace-nowrap text-center text-[19px] font-semibold tracking-[-0.3px] text-[#1F2D27] ${titleContent ? "overflow-visible" : "overflow-hidden"}`}>{titleContent ?? title}</div>}
      {!title && !titleContent && <div aria-hidden="true" />}
      <div className="flex items-center justify-end gap-2">
        {postButton}
        {shareButton}
        {right ?? (!hideProfile && (
          <HeaderAction label="Open Account Settings" onClick={() => requireAuth(() => navigate("/account-settings"), "manage your account")} className="overflow-hidden p-0">
            {avatar ? <img src={avatar} alt="Profile" className="h-full w-full object-cover" /> : <UserRound className="h-[18px] w-[18px]" strokeWidth={2} />}
          </HeaderAction>
        ))}
      </div>
    </header>
  );
}
