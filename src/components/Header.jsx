import { useNavigate } from "react-router-dom";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useSellerSettings } from "../context/SellerSettingsContext";

export default function Header({ title, titleContent, onBack, onMenu, right, postButton }) {
  const navigate = useNavigate();
  const { settings: buyerSettings } = useBuyerSettings();
  const { profileMode } = useProfileMode();
  const { getSellerProfile } = useSellerSettings();
  const avatar = profileMode === "seller" ? getSellerProfile("sarahs-backyard").avatar : buyerSettings.avatar;

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-[#E6E6E6]">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button onClick={onBack} aria-label="Back" className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9.27 12 16.28 5a.5.5 0 0 0 0-.7l-.57-.57a.5.5 0 0 0-.7 0l-7.93 7.93a.5.5 0 0 0 0 .7l7.93 7.93a.5.5 0 0 0 .7 0l.57-.57a.5.5 0 0 0 0-.7L9.27 12Z"
                fill="black"
              />
            </svg>
          </button>
        ) : onMenu ? (
          <button onClick={onMenu} aria-label="Menu" className="p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.1 6a.9.9 0 0 1 .9-.9h16a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Zm0 6a.9.9 0 0 1 .9-.9h12.59a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Zm0 6a.9.9 0 0 1 .9-.9h16a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Z"
                fill="black"
              />
            </svg>
          </button>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.1 6a.9.9 0 0 1 .9-.9h16a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Zm0 6a.9.9 0 0 1 .9-.9h12.59a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Zm0 6a.9.9 0 0 1 .9-.9h16a.9.9 0 1 1 0 1.8H4a.9.9 0 0 1-.9-.9Z"
              fill="black"
            />
          </svg>
        )}
      </div>
      {(title || titleContent) && (
        <div className="text-[20px] font-semibold tracking-[-0.4px] flex-1 text-center">
          {titleContent ?? title}
        </div>
      )}
      <div className="flex items-center gap-2">
        {postButton}
        {right ?? (
          <button type="button" onClick={() => navigate("/account-settings")} aria-label="Open Account Settings" className="rounded-full">
            <img
              src={avatar}
              alt="Profile"
              className="w-6 h-6 rounded-full object-cover"
            />
          </button>
        )}
      </div>
    </div>
  );
}
