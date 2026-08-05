import { promotionDisplayLabel } from "../context/PromotionContext";

export default function PromotionsModal({ promotions, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/40" role="presentation" onClick={onClose}>
      <section className="w-full rounded-t-2xl bg-white p-5" role="dialog" aria-modal="true" aria-labelledby="promotions-title" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <h2 id="promotions-title" className="text-[20px] font-semibold">Active Promotions</h2>
          <button type="button" onClick={onClose} className="text-[14px] font-medium text-[#498467]">Close</button>
        </div>
        <div className="mt-4 flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {promotions.map((promotion) => (
            <article key={promotion.id} className="rounded-lg border border-[#CFF7D3] bg-[#F5FFF6] p-3">
              <div className="text-[12px] font-medium uppercase tracking-[0.3px] text-[#498467]">{promotionDisplayLabel(promotion)}</div>
              <h3 className="mt-1 text-[15px] font-semibold">{promotion.title}</h3>
              <p className="mt-1 text-[12px] text-[#828282]">Available on {promotion.productIds?.length ?? 0} listing{promotion.productIds?.length === 1 ? "" : "s"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
