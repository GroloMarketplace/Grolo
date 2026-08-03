import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import SearchBar from "../components/SearchBar";
import { categories, products, sellers } from "../data/mockData";

function getCategoryName(value) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "Category";
  }
}

export default function Category() {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const category = getCategoryName(categoryName);
  const [query, setQuery] = useState("");
  const categoryExists = categories.some((item) => item.name === category);
  const categoryProducts = useMemo(
    () => products.filter((product) => product.category?.toLowerCase() === category.toLowerCase()),
    [category],
  );
  const filteredProducts = categoryProducts.filter((product) => {
    const searchableText = `${product.name} ${product.shop}`.toLowerCase();
    return searchableText.includes(query.trim().toLowerCase());
  });

  return (
    <MobileScreenLayout>
      <Header title={categoryExists ? category : "Category"} onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="border-b border-black/5 py-3">
          <SearchBar
            placeholder={`Search within ${category}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-6 px-4 py-4">
          <ProductSection title="Featured Products" products={filteredProducts} />
          <ProductSection title="Trending in Category" products={filteredProducts.slice(0, 4)} />
          <ProductSection title="New Arrivals" products={filteredProducts.slice().reverse().slice(0, 4)} />
          <ProductSection title="Popular Near You" products={filteredProducts.slice(0, 4)} />
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function ProductSection({ title, products: sectionProducts }) {
  return (
    <section>
      <h2 className="mb-3 text-[18px] font-semibold tracking-[-0.36px]">{title}</h2>
      {sectionProducts.length === 0 ? (
        <div className="rounded-lg border border-[#E6E6E6] px-4 py-5 text-center text-[14px] text-[#828282]">
          No products found in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sectionProducts.map((product) => (
            <CategoryProductCard key={`${title}-${product.id}`} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

function CategoryProductCard({ product }) {
  const navigate = useNavigate();
  const seller = sellers[product.sellerId];

  return (
    <article className="min-w-0">
      <Link to={`/product/${product.id}`} className="block">
        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full rounded-lg object-cover"
        />
      </Link>
      <div className="flex flex-col gap-1 pt-2">
        <button
          type="button"
          onClick={() => navigate(`/seller/${product.sellerId}`)}
          className="truncate text-left text-[12px] text-[#498467]"
        >
          {seller?.name ?? product.shop}
        </button>
        <Link to={`/product/${product.id}`} className="line-clamp-2 text-[14px] font-medium">
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-[12px] text-[#828282]">
          <span className="text-[#498467]">★</span>
          <span>{product.rating?.toFixed(1) ?? "New"}</span>
          {product.reviewCount && <span>({product.reviewCount})</span>}
        </div>
        <span className="text-[16px] font-semibold">${product.price.toFixed(2)}</span>
      </div>
    </article>
  );
}
