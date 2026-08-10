import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfileMode } from "../context/ProfileModeContext";
import { useBuyerSettings } from "../context/BuyerSettingsContext";
import { useSellerSettings } from "../context/SellerSettingsContext";

export default function Sidebar({ isOpen, onClose, mode = "seller" }) {
  const navigate = useNavigate();
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteText, setDeleteText] = useState("");
  const { signOut } = useAuth();
  const { canSeller, setProfileMode } = useProfileMode();
  const { settings: buyerSettings } = useBuyerSettings();
  const { getSellerProfile } = useSellerSettings();
  const avatar = mode === "seller" ? getSellerProfile("current-user").avatar : buyerSettings.avatar;

  const handleMenuClick = (action) => {
    onClose();
    action();
  };

  const sellerItems = [
    ["Store Orders", "/my-shop/orders"],
    ["Advertising", "/my-shop/advertising"],
    ["Analytics", "/analytics"],
    ["Performance", "/profit"],
    ["Account Settings", "/account-settings"],
  ];
  const buyerItems = [
    ["Saved Items", "/saved"],
    ["Community Impact", "/community-impact"],
    ["Account Settings", "/account-settings"],
  ];
  const items = mode === "buyer" ? buyerItems : sellerItems;

  return (
    <>
      {isOpen && <div className="absolute inset-0 z-40 h-full bg-black/50" onClick={onClose} />}
      <div className={`absolute bottom-0 left-0 top-0 z-50 h-full w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4">
          <div className="mb-6 flex items-center gap-3 border-b border-[#E6E6E6] pb-4">
            <img src={avatar} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
            <div><div className="text-[16px] font-semibold">{mode === "buyer" ? "Buyer Profile" : "My Shop"}</div><div className="text-[12px] text-[#828282]">{mode === "buyer" ? "Buyer Account" : "Seller Account"}</div></div>
          </div>
          <h2 className="mb-6 text-xl font-semibold">Menu</h2>
          <nav className="flex flex-col gap-2">
            {items.map(([label, path]) => <button key={label} onClick={() => handleMenuClick(() => navigate(path, mode === "seller" ? { state: { fromSellerMenu: true } } : undefined))} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">{label}</button>)}
            {mode === "buyer" && (canSeller ? <button onClick={() => handleMenuClick(() => { setProfileMode("seller"); navigate("/shop"); })} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">Switch to Seller Profile</button> : <button onClick={() => handleMenuClick(() => navigate("/open-store"))} className="rounded-lg bg-[#498467] px-4 py-3 text-left font-medium text-white transition-colors duration-200 hover:bg-[#376B50]">Open a Store</button>)}
            <button onClick={() => handleMenuClick(() => { signOut(); navigate("/signin"); })} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">Logout</button>
            <button type="button" onClick={() => handleMenuClick(() => { setDeleteText(""); setDeleteStep(1); })} className="mt-3 flex items-center gap-3 border-t border-[#E6E6E6] px-4 pt-4 text-left text-red-600 hover:text-red-700">
              <TrashIcon />
              <span>Delete Account</span>
            </button>
          </nav>
        </div>
      </div>
      {deleteStep > 0 && <DeleteAccountModal step={deleteStep} confirmation={deleteText} onConfirmationChange={setDeleteText} onClose={() => setDeleteStep(0)} onContinue={() => setDeleteStep(2)} onDelete={async () => { localStorage.clear(); sessionStorage.setItem("grolo-account-deleted", "true"); await signOut(); window.location.assign("/signin"); }} />}
    </>
  );
}

function DeleteAccountModal({ step, confirmation, onConfirmationChange, onClose, onContinue, onDelete }) {
  if (step === 2) {
    return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title"><section className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-2xl"><h2 id="delete-confirm-title" className="text-[20px] font-semibold">Are You Sure?</h2><p className="mt-3 text-[13px] leading-[150%] text-[#4F4F4F]">This action is permanent and cannot be reversed.</p><label className="mt-4 flex flex-col gap-2 text-[13px] font-medium">Type <span className="font-bold tracking-wider">DELETE</span><input autoFocus value={confirmation} onChange={(event) => onConfirmationChange(event.target.value)} className="rounded-lg border border-[#E0E0E0] px-3 py-3 outline-none focus:border-red-500" /></label><div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#E0E0E0] py-3 text-[14px] font-medium">Cancel</button><button type="button" disabled={confirmation !== "DELETE"} onClick={onDelete} className="flex-1 rounded-lg bg-red-600 py-3 text-[14px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Permanently Delete</button></div></section></div>;
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title"><section className="max-h-[90vh] w-full max-w-[380px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><h2 id="delete-account-title" className="text-[20px] font-semibold">We're Sorry to See You Go</h2><p className="mt-3 text-[13px] leading-[150%] text-[#4F4F4F]">Thank you for being part of the Grolo community.</p><p className="mt-3 text-[13px] font-medium">Deleting your account will permanently remove:</p><ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-[#4F4F4F]"><li>Your profile</li><li>Messages</li><li>Followers and following</li><li>Saved items</li><li>Activity history</li><li>Reviews</li><li>Trust &amp; Reputation progress</li><li>Store profile, listings, events, promotions, and seller statistics if you have a store</li></ul><p className="mt-3 text-[12px] font-semibold text-red-600">This action cannot be undone.</p><div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#E0E0E0] py-3 text-[14px] font-medium">Keep My Account</button><button type="button" onClick={onContinue} className="flex-1 rounded-lg bg-red-600 py-3 text-[14px] font-medium text-white">Delete Account</button></div></section></div>;
}

function TrashIcon() {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
