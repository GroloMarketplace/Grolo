import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import OutlineIcon from "../components/OutlineIcon";
import { useAuth } from "../context/AuthContext";
import { getVendorAnalytics } from "../lib/api/analytics";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const FILTER_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "30 Days", value: 30 },
  { label: "90 Days", value: 90 },
  { label: "All Time", value: 365 },
];

function emptyAnalytics(periodDays) {
  return {
    periodDays,
    store: { totalFollowers: 0, totalFavorites: 0, listingsPublished: 0, activePromotions: 0 },
    sales: { revenueToday: 0, revenueThisWeek: 0, revenueThisMonth: 0, ordersReceived: 0 },
    listings: { views: 0, favorites: 0, orders: 0, conversionRate: 0 },
    promotions: { views: 0, clicks: 0, purchases: 0, revenue: 0 },
    daily: [],
  };
}

function money(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function number(value) {
  return Number(value ?? 0).toLocaleString();
}

function MetricCard({ label, value, icon, detail }) {
  return (
    <div className="rounded-lg border border-[#E0E0E0] p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center text-[#4F4F4F]"><OutlineIcon name={icon} size={16} /></span>
        <div className="text-[12px] font-medium text-[#828282]">{label}</div>
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-[-0.48px]">{value}</div>
      {detail && <div className="mt-1 text-[11px] text-[#828282]">{detail}</div>}
    </div>
  );
}

function ChartCard({ title, daily, field, color, format = number }) {
  const values = daily.map((item) => Number(item[field] ?? 0));
  const labels = daily.map((item) => item.label);
  return (
    <div className="mx-4 mb-4 rounded-lg border border-[#E0E0E0] p-4">
      <div className="mb-4 text-[14px] font-semibold">{title}</div>
      <Chart data={values.length ? values : [0]} color={color} />
      <div className="mt-2 flex justify-between gap-2 overflow-hidden text-[10px] text-[#828282]">
        {(labels.length ? labels : ["No activity"]).filter((_, index, items) => index === 0 || index === items.length - 1 || index === Math.floor(items.length / 2)).map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
      </div>
      <div className="mt-2 text-right text-[12px] text-[#666]">Total: {format(values.reduce((sum, value) => sum + value, 0))}</div>
    </div>
  );
}

export default function Analytics() {
  const [periodDays, setPeriodDays] = useState(30);
  const [analytics, setAnalytics] = useState(() => emptyAnalytics(30));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let channel;
    setLoading(true);
    setError("");
    if (!user?.id) {
      setAnalytics(emptyAnalytics(periodDays));
      setLoading(false);
      return () => { cancelled = true; };
    }

    const loadAnalytics = () => getVendorAnalytics(user.id, periodDays)
      .then((data) => { if (!cancelled) setAnalytics(data ?? emptyAnalytics(periodDays)); })
      .catch((loadError) => {
        if (!cancelled) {
          console.error("Unable to load vendor analytics", loadError);
          setError(loadError.message || "Analytics could not be loaded.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    loadAnalytics();
    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`vendor-analytics:${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `seller_id=eq.${user.id}` }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "listings", filter: `seller_id=eq.${user.id}` }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "promotions", filter: `seller_id=eq.${user.id}` }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "user_follows", filter: `seller_id=eq.${user.id}` }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, loadAnalytics)
        .on("postgres_changes", { event: "*", schema: "public", table: "vendor_analytics_events", filter: `seller_id=eq.${user.id}` }, loadAnalytics)
        .subscribe();
    }
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [periodDays, user?.id]);

  const daily = analytics.daily ?? [];
  const hasActivity = daily.some((item) => Number(item.views) || Number(item.favorites) || Number(item.orders) || Number(item.revenue));

  return (
    <MobileScreenLayout>
      <div className="flex min-h-full flex-col">
        <Header title="Analytics" onBack={() => navigate("/shop", { state: { openSellerMenu: true } })} />
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          <div className="flex gap-2 overflow-x-auto px-4 py-4 no-scrollbar">
            {FILTER_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setPeriodDays(option.value)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] font-medium ${periodDays === option.value ? "bg-[#498467] text-white" : "bg-[#F6F6F6] text-black"}`}>
                {option.label}
              </button>
            ))}
          </div>
          {loading && <p className="px-4 py-10 text-center text-[14px] text-[#777]">Loading analytics...</p>}
          {error && <div role="alert" className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">{error}</div>}
          {!loading && !error && (
            <>
              <section className="mb-5 px-4">
                <h2 className="mb-3 text-[16px] font-semibold">Store</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Total Followers" value={number(analytics.store.totalFollowers)} icon="users" />
                  <MetricCard label="Total Favorites" value={number(analytics.store.totalFavorites)} icon="heart" />
                  <MetricCard label="Listings Published" value={number(analytics.store.listingsPublished)} icon="box" />
                  <MetricCard label="Active Promotions" value={number(analytics.store.activePromotions)} icon="sales" />
                </div>
              </section>
              <section className="mb-5 px-4">
                <h2 className="mb-3 text-[16px] font-semibold">Sales</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Revenue Today" value={money(analytics.sales.revenueToday)} icon="sales" />
                  <MetricCard label="Revenue This Week" value={money(analytics.sales.revenueThisWeek)} icon="sales" />
                  <MetricCard label="Revenue This Month" value={money(analytics.sales.revenueThisMonth)} icon="sales" />
                  <MetricCard label="Orders Received" value={number(analytics.sales.ordersReceived)} icon="box" />
                </div>
              </section>
              <section className="mb-5 px-4">
                <h2 className="mb-3 text-[16px] font-semibold">Listings</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Listing Views" value={number(analytics.listings.views)} icon="eye" />
                  <MetricCard label="Favorites" value={number(analytics.listings.favorites)} icon="heart" />
                  <MetricCard label="Orders" value={number(analytics.listings.orders)} icon="sales" />
                  <MetricCard label="Conversion Rate" value={`${Number(analytics.listings.conversionRate ?? 0).toFixed(2)}%`} icon="sales" detail="Orders divided by views" />
                </div>
              </section>
              <section className="mb-5 px-4">
                <h2 className="mb-3 text-[16px] font-semibold">Promotions</h2>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Promotion Views" value={number(analytics.promotions.views)} icon="eye" />
                  <MetricCard label="Promotion Clicks" value={number(analytics.promotions.clicks)} icon="eye" />
                  <MetricCard label="Purchases" value={number(analytics.promotions.purchases)} icon="sales" />
                  <MetricCard label="Revenue Generated" value={money(analytics.promotions.revenue)} icon="sales" />
                </div>
              </section>
              {!hasActivity && <div className="mx-4 mb-4 rounded-lg bg-[#F5FFF6] px-4 py-4 text-center"><p className="text-[15px] font-semibold">No analytics yet.</p><p className="mt-1 text-[13px] text-[#5D7459]">Activity will appear as your store receives views, favorites, orders, and promotion engagement.</p></div>}
              <ChartCard title="Views Over Time" daily={daily} field="views" color="#498467" />
              <ChartCard title="Favorites Over Time" daily={daily} field="favorites" color="#FF6B6B" />
              <ChartCard title="Revenue Over Time" daily={daily} field="revenue" color="#4ECDC4" format={money} />
            </>
          )}
        </div>
      </div>
    </MobileScreenLayout>
  );
}

function Chart({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = data.length === 1 ? 155.5 : (index / (data.length - 1)) * 311;
    const y = 160 - ((value - min) / range * 140 + 10);
    return `${x},${y}`;
  }).join(" ");
  const gradientId = `chartGradient-${color.replace("#", "")}`;
  const lastY = 160 - ((data[data.length - 1] - min) / range * 140 + 10);
  return (
    <svg viewBox="0 0 311 160" className="h-40 w-full" role="img" aria-label="Analytics chart">
      <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <polygon fill={`url(#${gradientId})`} points={`${points} 311,160 0,160`} />
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.15" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <circle cx={data.length === 1 ? 155.5 : 311} cy={lastY} r="4" fill={color} />
    </svg>
  );
}
