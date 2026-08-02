import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfileMode } from "../context/ProfileModeContext";

export default function ProfileSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileMode, setProfileMode } = useProfileMode();
  const [open, setOpen] = useState(false);
  const isBuyerPath = location.pathname === "/profile" || location.pathname === "/buyer-profile";
  const isSeller = !isBuyerPath && (profileMode === "seller" || location.pathname === "/shop" || location.pathname === "/seller-profile");
  const label = isSeller ? "Seller Profile" : "Buyer Profile";

  const switchProfile = (mode) => {
    setProfileMode(mode);
    setOpen(false);
    navigate(mode === "buyer" ? "/buyer-profile" : "/seller-profile");
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-[20px] font-semibold tracking-[-0.4px]"
        aria-expanded={open}
      >
        {label}
        <span className="text-[14px] text-[#498467]">▼</span>
      </button>
      {open && (
        <div className="absolute left-1/2 top-9 z-50 min-w-[160px] -translate-x-1/2 rounded-lg border border-[#E6E6E6] bg-white p-1 text-left shadow-lg">
          <ProfileOption active={!isSeller} label="Buyer Profile" onClick={() => switchProfile("buyer")} />
          <ProfileOption active={isSeller} label="Seller Profile" onClick={() => switchProfile("seller")} />
        </div>
      )}
    </div>
  );
}

function ProfileOption({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded px-3 py-2 text-left text-[14px] ${active ? "bg-[#F5FFF6] font-semibold text-[#498467]" : "hover:bg-[#F5FFF6]"}`}
    >
      {label}
    </button>
  );
}
