import { promotionUrgencyLabel } from "../context/PromotionContext";
import PromotionBadge from "./PromotionBadge";

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
            <article key={promotion.id} className="rounded-xl border border-[#F3D38A] bg-gradient-to-br from-[#FFFDF5] to-[#F5FFF6] p-4 shadow-[0_4px_14px_rgba(73,132,103,0.12)]">
              <div className="flex items-center justify-between gap-3"><PromotionBadge promotion={promotion} /><span className="text-[11px] font-semibold text-[#B56576]">⏳ {promotionUrgencyLabel(promotion)}</span></div>
              <h3 className="mt-3 text-[17px] font-bold">{promotion.title}</h3>
              <p className="mt-2 text-[12px] text-[#828282]">Available on {promotion.productIds?.length ?? 0} listing{promotion.productIds?.length === 1 ? "" : "s"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
