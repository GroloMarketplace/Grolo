import { useState } from "react";
import SearchBar from "../components/SearchBar";
import CarouselRow from "../components/CarouselRow";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { categories, products } from "../data/mockData";

const TABS = ["Local", "History", "My Stores"];

export default function Search() {
  const [tab, setTab] = useState("Local");

  return (
    <MobileScreenLayout>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-center gap-8 px-4 py-2.5 border-b border-black/5 relative">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[14px] font-semibold tracking-[-0.28px] relative ${
              tab === t ? "text-[#498467]" : "text-black/40"
            }`}
          >
            {t}
            {tab === t && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#498467]" />}
          </button>
        ))}
      </div>

      <div className="sticky top-[57px] bg-white z-9 py-3 border-b border-black/5">
        <SearchBar />
      </div>

      {tab === "Local" && (
        <>
          <div className="px-4">
            <div className="rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
                alt="Calgary Farmers Market"
                className="w-full h-[136px] object-cover"
              />
            </div>
          </div>
          <CategoryRow />
          <CarouselRow title="Featured" products={products} />
        </>
      )}

      {tab === "History" && (
        <>
          <CategoryRow />
          <CarouselRow title="Today" products={products} />
        </>
      )}

      {tab === "My Stores" && (
        <>
          <StoreRow />
          <CarouselRow title="Top Shops" products={products} />
        </>
      )}
    </MobileScreenLayout>
  );
}

function CategoryRow() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">
          Category
        </span>
      </div>
      <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
        {categories.map((c) => (
          <div key={c.name} className="flex flex-col items-center gap-2 shrink-0">
            <img
              src={c.image}
              alt={c.name}
              className="w-[76px] h-[76px] rounded-full object-cover"
            />
            <span className="text-[14px] font-medium">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreRow() {
  const stores = [
    { name: "Sarah’s Backyard", image: categories[0].image },
    { name: "Jenny’s Home Bake Shop", image: categories[1].image },
    { name: "Cozy Cottage Crafts", image: categories[2].image },
    { name: "Mike’s Meal Prep", image: categories[3].image },
  ];
  return (
    <div className="py-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[16px] font-semibold tracking-[-0.32px]">
          All
        </span>
      </div>
      <div className="flex gap-6 px-4 overflow-x-auto no-scrollbar">
        {stores.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-2 shrink-0 w-[76px]">
            <img
              src={s.image}
              alt={s.name}
              className="w-[76px] h-[76px] rounded-full object-cover"
            />
            <span className="text-[10px] font-medium text-center line-clamp-1">
              {s.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
