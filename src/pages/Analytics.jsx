import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { analyticsData } from "../data/mockData";
import OutlineIcon from "../components/OutlineIcon";

const FILTER_OPTIONS = [
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "90 Days", value: "90days" },
  { label: "All Time", value: "allTime" },
];

const STATS = [
  { key: "totalViews", label: "Total Views", icon: "eye" },
  { key: "totalFavorites", label: "Total Favorites", icon: "heart" },
  { key: "totalMessages", label: "Total Messages", icon: "message" },
  { key: "totalFollowers", label: "Total Followers", icon: "users" },
  { key: "totalListings", label: "Total Listings", icon: "box" },
  { key: "totalOrders", label: "Orders", icon: "sales" },
  { key: "totalRevenue", label: "Revenue", icon: "sales" },
  { key: "averageRating", label: "Average Rating", icon: "star" },
];

export default function Analytics() {
  const [filter, setFilter] = useState("7days");
  const navigate = useNavigate();
  const data = analyticsData[filter];

  return (
    <MobileScreenLayout>
      <div className="flex flex-col min-h-full">
        <Header
          title="Analytics"
          onBack={() => navigate("/shop", { state: { openSellerMenu: true } })}
        />

        <div className="overflow-y-auto flex-1 no-scrollbar">
        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto no-scrollbar">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium whitespace-nowrap ${
                filter === option.value ? "bg-[#498467] text-white" : "bg-[#F6F6F6] text-black"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((stat) => (
              <div
                key={stat.key}
                className="rounded-lg border border-[#E0E0E0] p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center text-[#4F4F4F]"><OutlineIcon name={stat.icon} size={16} /></span>
                  <div className="text-[12px] font-medium text-[#828282]">{stat.label}</div>
                </div>
                <div className="text-[24px] font-semibold tracking-[-0.48px]">
                  {stat.key === "averageRating" ? data[stat.key].toFixed(1) : stat.key === "totalRevenue" ? `$${data[stat.key].toFixed(2)}` : data[stat.key].toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {data.totalViews === 0 && data.totalOrders === 0 && data.totalRevenue === 0 && (
          <div className="mx-4 mb-4 rounded-lg bg-[#F5FFF6] px-4 py-4 text-center">
            <p className="text-[15px] font-semibold">No analytics yet.</p>
            <p className="mt-1 text-[13px] text-[#5D7459]">Views, orders, and revenue will appear after your store starts receiving activity.</p>
          </div>
        )}

        {/* Views Chart */}
        <div className="mx-4 mb-4 rounded-lg border border-[#E0E0E0] p-4">
          <div className="text-[14px] font-semibold mb-4">Views Over Time</div>
          <Chart data={data.viewsOverTime} color="#498467" />
          <div className="flex justify-between text-[10px] text-[#828282] mt-2">
            {data.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        {/* Favorites Chart */}
        <div className="mx-4 mb-4 rounded-lg border border-[#E0E0E0] p-4">
          <div className="text-[14px] font-semibold mb-4">Favorites Over Time</div>
          <Chart data={data.favoritesOverTime} color="#FF6B6B" />
          <div className="flex justify-between text-[10px] text-[#828282] mt-2">
            {data.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>

        {/* Messages Chart */}
        <div className="mx-4 mb-8 rounded-lg border border-[#E0E0E0] p-4">
          <div className="text-[14px] font-semibold mb-4">Messages Received Over Time</div>
          <Chart data={data.messagesOverTime} color="#4ECDC4" />
          <div className="flex justify-between text-[10px] text-[#828282] mt-2">
            {data.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
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
    const x = (index / (data.length - 1)) * 311;
    const normalizedValue = (value - min) / range;
    const y = 160 - (normalizedValue * 140 + 10);
    return `${x},${y}`;
  }).join(" ");

  const gradientId = `chartGradient-${color.replace("#", "")}`;

  return (
    <svg viewBox="0 0 311 160" className="w-full h-40">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#${gradientId})`}
        points={`${points} 311,160 0,160`}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="311" cy={160 - ((data[data.length - 1] - min) / range * 140 + 10)} r="4" fill={color} />
    </svg>
  );
}