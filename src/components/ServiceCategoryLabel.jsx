export default function ServiceCategoryLabel({ listing, className = "" }) {
  if (listing?.category !== "Services") return null;

  return <span className={`text-[12px] font-medium text-[#B56576] ${className}`}>In Services</span>;
}
