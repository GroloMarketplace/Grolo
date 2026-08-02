import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleMenuClick = (action) => {
    onClose();
    action();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-40 h-full"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`absolute left-0 top-0 bottom-0 w-64 bg-white z-50 shadow-lg transform transition-transform duration-300 ease-in-out h-full ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4">
          {/* Profile Section */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E6E6E6]">
            <img
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80"
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <div className="font-semibold text-[16px]">My Shop</div>
              <div className="text-[12px] text-[#828282]">Seller Account</div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-6">Menu</h2>
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => handleMenuClick(() => navigate("/create-listing"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Create New Listing
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/my-shop/orders"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Store Orders
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/orders"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              My Orders
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/analytics"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Analytics
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/my-shop/events"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Events
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/profit"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Performance
            </button>
            <button
              onClick={() => handleMenuClick(() => navigate("/account-settings"))}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Account Settings
            </button>
            <button
              onClick={() => handleMenuClick(() => {
                signOut();
                navigate("/signin");
              })}
              className="text-left px-4 py-3 rounded-lg hover:bg-[#498467] hover:text-white transition-colors duration-200"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
