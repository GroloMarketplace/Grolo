import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../hooks/useSidebar";

export default function AccountSettings() {
  const { user } = useAuth();
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();

  return (
    <>
      <div>
        <Header 
          title="Account Settings" 
          onMenu={openSidebar}
        />
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full px-4 py-3 rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Display Name</label>
              <input
                type="text"
                placeholder="Enter your display name"
                className="w-full px-4 py-3 rounded-lg border border-[#E0E0E0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Shop Name</label>
              <input
                type="text"
                placeholder="Enter your shop name"
                className="w-full px-4 py-3 rounded-lg border border-[#E0E0E0]"
              />
            </div>
            <button className="w-full rounded-lg bg-[#498467] text-white py-3 font-medium">
              Save Changes
            </button>
          </div>
        </div>
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
