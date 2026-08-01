import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import CarouselRow from "../components/CarouselRow";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../hooks/useSidebar";
import { products } from "../data/mockData";

export default function ShopHome() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();

  return (
    <>
      <div className="flex flex-col min-h-full">
        <Header
          title="My Shop"
          onMenu={openSidebar}
        />
        <div className="pt-4 pb-4">
          <SearchBar />
        </div>
        <div className="flex flex-col items-center px-6 text-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#F5F5F5]" />
          <p className="text-[14px] leading-[140%]">
            I've grown lots of fruits and vegetables in my backyard and would
            love to share them with the community! All produce is grown with
            100% organic soil and seeds.
          </p>
          <button className="rounded-lg bg-[#498467] text-[#F5F5F5] text-[16px] px-6 py-3 border border-[#B2B2B2]">
            Follow
          </button>
        </div>
        <div className="px-4 pt-6">
          <div className="rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
              alt="Calgary Farmers Market"
              className="w-full h-[136px] object-cover"
            />
          </div>
        </div>
        <CarouselRow title="Featured" products={products.slice(0, 3)} />
      </div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}
