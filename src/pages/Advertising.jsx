import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAdvertising } from "../context/AdvertisingContext";

const STATUS_STYLES = {
  Trial: "bg-[#CFF7D3] text-[#02542D]",
  Active: "bg-[#498467] text-white",
  Pending: "bg-[#FFF2CC] text-[#7A5B00]",
  Expired: "bg-[#F5F5F5] text-[#828282]",
};

export default function Advertising() {
  const navigate = useNavigate();
  const { ads, cancelAd } = useAdvertising();

  return (
    <MobileScreenLayout>
      <Header title="Advertising" onBack={() => navigate("/shop", { state: { openSellerMenu: true } })} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-5 px-4 py-5">
          <section className="rounded-lg border border-[#498467] bg-[#F5FFF6] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.5px] text-[#498467]">Advertising</p>
                <h2 className="mt-1 text-[22px] font-semibold">Community Spotlight</h2>
              </div>
              <span className="rounded-full bg-[#CFF7D3] px-2.5 py-1 text-[11px] font-semibold text-[#02542D]">One plan</span>
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <p className="text-[16px] font-semibold">30-day free trial</p>
              <p className="text-[14px] text-[#828282]">Then $4.99 per week</p>
            </div>
            <p className="mt-3 text-[14px] leading-[140%] text-[#4F4F4F]">
              Promote your store, products, events, or seasonal specials to local shoppers.
              Get boosted visibility across Grolo discovery, including the Grown Local page and Community Spotlight placements.
            </p>
            <button type="button" onClick={() => navigate("/my-shop/advertising/create")} className="mt-4 w-full rounded-lg bg-[#498467] py-3 text-[14px] font-semibold text-white">
              Start 30-Day Trial
            </button>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Current Ads</h2>
              <span className="text-[12px] text-[#828282]">{ads.length} total</span>
            </div>
            <div className="flex flex-col gap-3">
              {ads.length === 0 ? (
                <div className="rounded-lg border border-[#E6E6E6] px-4 py-6 text-center text-[14px] text-[#828282]">No Community Spotlight ads yet.</div>
              ) : ads.map((ad) => (
                <article key={ad.id} className="rounded-lg border border-[#E6E6E6] p-3">
                  <div className="flex gap-3">
                    <img src={ad.image} alt={ad.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-[15px] font-semibold">{ad.title}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${STATUS_STYLES[ad.status] ?? STATUS_STYLES.Pending}`}>{ad.status}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-[#498467]">Community Spotlight • {ad.type}</p>
                      <p className="mt-1 text-[12px] text-[#828282]">{ad.startsAt} – {ad.endsAt}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => navigate(`/my-shop/advertising/create?adId=${ad.id}`)} className="flex-1 rounded-lg border border-[#498467] py-2 text-[13px] font-medium text-[#498467]">Edit</button>
                    <button type="button" onClick={() => cancelAd(ad.id)} disabled={ad.status === "Expired"} className="flex-1 rounded-lg border border-[#E6E6E6] py-2 text-[13px] font-medium text-[#828282] disabled:opacity-50">Cancel</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
