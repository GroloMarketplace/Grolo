import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { COMMUNITY_SPOTLIGHT_PLAN, useAdvertising } from "../context/AdvertisingContext";
import { addCalendarDays, calendarDaysUntil, isCampaignActive } from "../utils/campaignDuration";

const STATUS_STYLES = {
  Trial: "bg-[#CFF7D3] text-[#02542D]",
  Active: "bg-[#498467] text-white",
  Pending: "bg-[#FFF2CC] text-[#7A5B00]",
  Expired: "bg-[#F5F5F5] text-[#828282]",
};

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getTrialStatus(ads, now = Date.now()) {
  const trialAd = [...ads].reverse().find((ad) => ad.trialStartedAt || ad.status === "Trial");
  if (!trialAd) return null;
  const startedAt = trialAd.trialStartedAt || trialAd.startsAt;
  if (!startedAt) return null;
  const expiresAt = trialAd.trialEndsAt || addCalendarDays(startedAt, COMMUNITY_SPOTLIGHT_PLAN.trialDays);
  const daysUntilExpiry = calendarDaysUntil(expiresAt, now);
  return {
    startedAt,
    expiresAt,
    isActive: trialAd.status !== "Expired" && daysUntilExpiry >= 0,
    daysRemaining: Math.max(0, daysUntilExpiry),
  };
}

export default function Advertising() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ads, cancelAd } = useAdvertising();
  const [trialActivation, setTrialActivation] = useState(null);
  const [now, setNow] = useState(Date.now());
  const trialStatus = getTrialStatus(ads, now);
  const activeCampaigns = ads.filter((ad) => isCampaignActive(ad, now));

  useEffect(() => {
    if (!location.state?.trialActivated) return;
    setTrialActivation(location.state.trialActivated);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.trialActivated, navigate]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <MobileScreenLayout>
      <Header title="Advertising" onBack={() => navigate("/shop", { state: { openSellerMenu: true } })} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-5 px-4 py-5">
          <section className="rounded-2xl border border-[#498467] bg-gradient-to-br from-[#F5FFF6] via-white to-[#EAF5ED] p-5 shadow-[0_6px_18px_rgba(31,90,69,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#498467]">Community Spotlight</p>
                <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.5px] text-[#1F2D27]">Get discovered by local shoppers.</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#CFF7D3] px-2.5 py-1 text-[11px] font-semibold text-[#02542D]">One plan</span>
            </div>
            <p className="mt-3 text-[14px] leading-[140%] text-[#4F4F4F]">Feature your store, products, and events throughout Grolo to attract more local customers.</p>
            <div className="mt-5 border-y border-[#DCEBE0] py-4">
              <p className="text-[16px] font-semibold text-[#1F2D27]">{COMMUNITY_SPOTLIGHT_PLAN.trialLabel}</p>
              <p className="mt-1 text-[13px] text-[#4F4F4F]">No credit card required.</p>
              <p className="text-[13px] text-[#4F4F4F]">No automatic renewal.</p>
              <p className="mt-2 text-[13px] font-semibold text-[#498467]">Continue for {COMMUNITY_SPOTLIGHT_PLAN.priceLabel} after your trial if you'd like.</p>
            </div>
            <div className="mt-4">
              <p className="text-[13px] font-semibold text-[#1F2D27]">Included benefits</p>
              <ul className="mt-2 grid gap-2 text-[13px] text-[#4F4F4F]">
                {COMMUNITY_SPOTLIGHT_PLAN.benefits.map((benefit) => <li key={benefit} className="flex gap-2"><span aria-hidden="true" className="font-semibold text-[#498467]">✓</span><span>{benefit}</span></li>)}
              </ul>
            </div>
            <button
              type="button"
              disabled={trialStatus?.isActive}
              onClick={() => { if (!trialStatus?.isActive) navigate("/my-shop/advertising/create"); }}
              className={`mt-5 w-full rounded-xl py-3 text-[14px] font-semibold text-white shadow-[0_4px_10px_rgba(73,132,103,0.2)] transition-colors ${trialStatus?.isActive ? "cursor-not-allowed bg-[#79A68A] opacity-75" : "bg-[#498467] hover:bg-[#376B50]"}`}
            >
              {trialStatus?.isActive ? `Trial Active • ${trialStatus.daysRemaining} Days Remaining` : "Start Free Trial"}
            </button>
          </section>

          {trialStatus && <TrialStatusCard trial={trialStatus} onUpgrade={() => navigate("/my-shop/advertising/create")} />}
          <section className="rounded-xl border border-[#DCEBE0] bg-white p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#498467]">Community Spotlight Status</p>
            <p className="mt-1 text-[16px] font-semibold text-[#1F2D27]">{activeCampaigns.length ? `${activeCampaigns.length} of 1 active campaigns` : "No active Community Spotlight campaign"}</p>
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
      {trialActivation && <TrialActivatedModal trial={trialActivation} onClose={() => setTrialActivation(null)} />}
    </MobileScreenLayout>
  );
}

function TrialStatusCard({ trial, onUpgrade }) {
  if (!trial.isActive) {
    return (
      <section className="rounded-xl border border-[#E6ECE8] bg-[#FAFBFA] p-4">
        <p className="text-[16px] font-semibold text-[#4F4F4F]">Trial Expired</p>
        <p className="mt-1 text-[13px] text-[#828282]">Community Spotlight is inactive.</p>
        <button type="button" onClick={onUpgrade} className="mt-3 text-[13px] font-semibold text-[#498467]">Upgrade for {COMMUNITY_SPOTLIGHT_PLAN.priceLabel} to continue promoting.</button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#B9DFC4] bg-[#F5FFF6] p-4">
      <p className="text-[16px] font-semibold text-[#245A43]">✅ Free Trial Active</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div><p className="text-[#828282]">Started:</p><p className="mt-0.5 font-semibold text-[#1F2D27]">{formatDate(trial.startedAt)}</p></div>
        <div><p className="text-[#828282]">Expires:</p><p className="mt-0.5 font-semibold text-[#1F2D27]">{formatDate(trial.expiresAt)}</p></div>
      </div>
      <p className="mt-3 text-[14px] font-semibold text-[#498467]">{trial.daysRemaining} {trial.daysRemaining === 1 ? "day" : "days"} remaining</p>
      <p className="mt-1 text-[12px] text-[#5D6B63]">No automatic renewal</p>
    </section>
  );
}

function TrialActivatedModal({ trial, onClose }) {
  const trialStatus = getTrialStatus([trial]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="trial-activated-title">
      <section className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#498467]">Community Spotlight</p>
        <h2 id="trial-activated-title" className="mt-1 text-[22px] font-semibold text-[#1F2D27]">Community Spotlight Activated</h2>
        <div className="mt-4 grid gap-3 rounded-xl bg-[#F5FFF6] p-4 text-[13px]">
          <div className="flex justify-between gap-3"><span className="text-[#828282]">Trial started</span><strong>{formatDate(trialStatus.startedAt)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#828282]">Trial expires</span><strong>{formatDate(trialStatus.expiresAt)}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-[#828282]">Duration remaining</span><strong>{trialStatus.daysRemaining} days</strong></div>
        </div>
        <p className="mt-4 rounded-lg border border-[#DCEBE0] px-3 py-2 text-[13px] font-semibold text-[#245A43]">No automatic renewal</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-[#498467] py-3 text-[14px] font-semibold text-white">Done</button>
      </section>
    </div>
  );
}
