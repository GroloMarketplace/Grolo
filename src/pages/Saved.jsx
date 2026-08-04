import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import MobileScreenLayout from "../components/MobileScreenLayout";
import PromotionBadge from "../components/PromotionBadge";
import { useSidebar } from "../hooks/useSidebar";
import { useFavorites } from "../hooks/useFavorites";
import { products } from "../data/mockData";
import { useSavedItems } from "../context/SavedContext";

export default function Saved() {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const { savedItems } = useSavedItems();
  const { favoriteIds } = useFavorites();
  const navigate = useNavigate();
  const savedPosts = savedItems.filter((item) => item.type === "post");
  const savedEvents = savedItems.filter((item) => item.type === "event");
  const savedPromotions = savedItems.filter((item) => item.type === "promotion");
  const savedListingIds = new Set([
    ...favoriteIds,
    ...savedItems.filter((item) => item.type === "listing").map((item) => item.sourceId),
  ]);
  const savedListings = products.filter((product) => savedListingIds.has(product.id));
  const hasSavedItems = savedPosts.length || savedEvents.length || savedListings.length || savedPromotions.length;

  return (
    <>
      <Header title="Saved Items" onMenu={openSidebar} />
      <MobileScreenLayout>
        <div className="overflow-y-auto flex-1 no-scrollbar px-4 py-6">
          {!hasSavedItems ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-6">
              <SavedSection title="Saved Posts" items={savedPosts} emptyText="Posts you save will appear here">
                {savedPosts.map((item) => (
                  <SavedContentCard
                    key={item.id}
                    item={item}
                    onClick={() => navigate("/", { state: { tab: item.feedTab ?? "Your Community", postId: item.sourceId } })}
                  />
                ))}
              </SavedSection>

              <SavedSection title="Saved Events" items={savedEvents} emptyText="Events you save will appear here">
                {savedEvents.map((item) => (
                  <SavedContentCard
                    key={item.id}
                    item={item}
                    event
                    onClick={() => navigate(`/event/${item.sourceId}`)}
                  />
                ))}
              </SavedSection>

              <SavedSection title="Saved Listings" items={savedListings} emptyText="Listings you save will appear here">
                {savedListings.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left hover:bg-[#F5FFF6] transition-colors"
                  >
                    <img src={product.image} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                      <span className="text-[12px] text-[#828282]">{product.shop}</span>
                      <span className="text-[16px] font-semibold">{product.name}</span>
                      <span className="text-[16px] font-semibold text-[#498467]">${product.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </SavedSection>

              <SavedSection title="Saved Promotions" items={savedPromotions} emptyText="Promotions you save will appear here">
                {savedPromotions.map((item) => (
                  <SavedContentCard
                    key={item.id}
                    item={item}
                    promotion
                    onClick={() => item.productId && navigate(`/product/${item.productId}`)}
                  />
                ))}
              </SavedSection>
            </div>
          )}
        </div>
      </MobileScreenLayout>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
    </>
  );
}

function SavedSection({ title, items, emptyText, children }) {
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-semibold">{title}</h2>
      {items.length ? <div className="flex flex-col gap-2">{children}</div> : <p className="text-[14px] text-[#828282]">{emptyText}</p>}
    </section>
  );
}

function SavedContentCard({ item, event, promotion, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 rounded-lg border border-[#E6E6E6] p-3 text-left hover:bg-[#F5FFF6] transition-colors"
    >
      <div className="relative shrink-0">
        <img src={item.image} alt="" className="h-20 w-20 rounded-lg object-cover" />
        {promotion && <PromotionBadge promotion={item.promotion} className="absolute left-1 top-1" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {item.storeImage && <img src={item.storeImage} alt="" className="h-5 w-5 rounded-full object-cover" />}
          <span className="truncate text-[12px] text-[#828282]">{item.storeName}</span>
        </div>
        <span className="text-[15px] font-semibold">{item.name}</span>
        <span className="line-clamp-2 text-[13px] leading-[130%] text-[#828282]">{item.description}</span>
        {event && item.event && (
          <span className="text-[12px] text-[#498467]">
            {item.event.location} · {item.event.date}
          </span>
        )}
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="1.5" className="mb-4">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="mb-2 text-[18px] font-semibold">No saved items yet</h3>
      <p className="text-center text-[14px] text-[#828282]">Items you save will appear here</p>
    </div>
  );
}
