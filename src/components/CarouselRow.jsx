import ProductCard from "./ProductCard";

export default function CarouselRow({ title, products, onSeeAll }) {
  return (
    <div className="pt-2 pb-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="text-[16px] font-semibold tracking-[-0.32px]">
          {title}
        </div>
        <button
          type="button"
          onClick={onSeeAll}
          aria-label={`See all ${title}`}
          className="p-0.5 rounded-full bg-[#F5F5F5]"
        >
          <svg width="14" height="14" viewBox="0 0 7 14" fill="none">
            <path
              d="M4.78 7 .79 3.01a.4.4 0 0 1 0-.55l.53-.53a.4.4 0 0 1 .55 0l4.73 4.73a.4.4 0 0 1 0 .55l-4.73 4.73a.4.4 0 0 1-.55 0l-.53-.53a.4.4 0 0 1 0-.55L4.78 7Z"
              fill="black"
            />
          </svg>
        </button>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
