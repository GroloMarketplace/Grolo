import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useSidebar } from "../hooks/useSidebar";
import { products } from "../data/mockData";

export default function Saved() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const savedItems = []; // Empty state for now

  return (
    <>
      <Header title="Saved Items" onMenu={openSidebar} />
      <MobileScreenLayout>
        {savedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="1.5" className="mb-4">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 className="text-[18px] font-semibold mb-2">No saved items yet</h3>
            <p className="text-[14px] text-[#828282] text-center">
              Items you save will appear here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-6">
            {savedItems.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 rounded-lg border border-[#E6E6E6]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 flex flex-col justify-center">
                  <h4 className="text-[16px] font-semibold">{item.name}</h4>
                  <p className="text-[14px] text-[#828282]">{item.shop}</p>
                  <p className="text-[16px] font-semibold text-[#498467]">${item.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
