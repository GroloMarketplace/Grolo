import { useState } from "react";
import Header from "../components/Header";
import { shoppers, chartXAxis } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

const TABS = {
  Revenue: {
    stat: { label: "Total Revenue", value: "$45,678.90", delta: "+20% month over month" },
    listTitle: "Recent Shoppers",
  },
  Followers: {
    stat: { label: "Followers", value: "2,405", delta: "+33% month over month" },
    listTitle: "Recent Followers",
  },
  Sales: {
    stat: { label: "Total Sales", value: "10,353", delta: "-8% month over month" },
    listTitle: "Top Products",
  },
};

const stats = [
  { label: "Total Revenue", value: "$45,678.90", delta: "+20% month over month" },
  { label: "Followers", value: "2,405", delta: "+33% month over month" },
  { label: "Total Sales", value: "10,353", delta: "-8% month over month" },
];

export default function Profit() {
  const [tab, setTab] = useState("Revenue");
  const active = TABS[tab];
  const { user, signOut } = useAuth();

  return (
    <div>
      <Header
        title="Profit"
        right={
          isSupabaseConfigured && user ? (
            <button
              onClick={signOut}
              className="text-[12px] font-medium text-[#828282]"
            >
              Sign out
            </button>
          ) : undefined
        }
      />
      <div className="flex gap-2 px-4 py-4">
        {Object.keys(TABS).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium ${
              tab === t ? "bg-[#498467] text-white" : "bg-[#F6F6F6] text-black"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
        {stats.map((s) => (
          <div
            key={s.label}
            className="w-[224px] shrink-0 rounded-lg border border-[#E0E0E0] p-4 flex flex-col gap-2"
          >
            <div className="text-[14px] font-semibold">{s.label}</div>
            <div className="text-[28px] font-semibold tracking-[-0.56px]">
              {s.value}
            </div>
            <div className="text-[12px] font-medium text-[#828282]">
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-lg border border-[#E0E0E0] p-4">
        <div className="text-[14px] font-semibold mb-4">{active.stat.label}</div>
        <Chart />
        <div className="flex justify-between text-[10px] text-[#828282] mt-2">
          {chartXAxis.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </div>

      <div className="mx-4 mt-4 mb-8 rounded-lg border border-[#E0E0E0] p-4">
        <div className="text-[14px] font-semibold mb-3">{active.listTitle}</div>
        <div className="flex flex-col gap-3">
          {shoppers.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <img
                src={s.avatar}
                alt={s.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="text-[14px] font-medium">{s.name}</div>
                <div className="text-[12px] text-[#828282]">{s.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chart() {
  return (
    <svg viewBox="0 0 311 160" className="w-full h-40">
      <polyline
        fill="none"
        stroke="#498467"
        strokeWidth="3"
        strokeLinecap="round"
        points="0,157 40,151 85,90 130,58 175,76 220,42 260,53 301,0"
      />
      <polygon
        fill="url(#chartGradient)"
        points="0,157 40,151 85,90 130,58 175,76 220,42 260,53 301,0 301,160 0,160"
      />
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#498467" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#498467" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="301" cy="0" r="4" fill="#498467" />
    </svg>
  );
}
