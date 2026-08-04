import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfileMode } from "../context/ProfileModeContext";

export default function Sidebar({ isOpen, onClose, mode = "seller" }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { canSeller, setProfileMode } = useProfileMode();

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
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" alt="Profile" className="h-12 w-12 rounded-full object-cover" />
            <div><div className="text-[16px] font-semibold">{mode === "buyer" ? "Buyer Profile" : "My Shop"}</div><div className="text-[12px] text-[#828282]">{mode === "buyer" ? "Buyer Account" : "Seller Account"}</div></div>
          </div>
          <h2 className="mb-6 text-xl font-semibold">Menu</h2>
          <nav className="flex flex-col gap-2">
            {items.map(([label, path]) => <button key={label} onClick={() => handleMenuClick(() => navigate(path, mode === "seller" ? { state: { fromSellerMenu: true } } : undefined))} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">{label}</button>)}
            {mode === "buyer" && canSeller && <button onClick={() => handleMenuClick(() => { setProfileMode("seller"); navigate("/shop"); })} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">Switch to Seller Profile</button>}
            <button onClick={() => handleMenuClick(() => { signOut(); navigate("/signin"); })} className="rounded-lg px-4 py-3 text-left transition-colors duration-200 hover:bg-[#498467] hover:text-white">Logout</button>
          </nav>
        </div>
      </div>
    </>
  );
}
