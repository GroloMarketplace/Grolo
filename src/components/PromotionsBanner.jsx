export default function PromotionsBanner({ count, onClick }) {
  return (
    <button type="button" onClick={onClick} className="mb-3 flex w-full items-center justify-between rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] px-3 py-2.5 text-left text-[14px] font-medium text-[#498467]">
      <span>🏷 Promotions ({count})</span>
      <span aria-hidden="true" className="text-[18px]">›</span>
    </button>
  );
}
