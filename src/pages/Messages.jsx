import { useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { messages } from "../data/mockData";

const TABS = ["All", "Selling", "Buying", "Orders"];

export default function Messages() {
  const [tab, setTab] = useState("All");

  return (
    <div>
      <div className="py-3">
        <SearchBar />
      </div>
      <div className="flex gap-2 px-4 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-[14px] font-medium border ${
              tab === t
                ? "bg-black text-white border-transparent"
                : "bg-white text-black/90 border-[#E6E6E6]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {messages.map((m) => (
          <Link
            key={m.id}
            to={`/messages/${m.id}`}
            className="flex gap-3 px-4 py-3 border-b border-black/5"
          >
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80"
              alt={m.name}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-[14px] font-semibold">{m.name}</span>
                <span className="text-[14px] text-[#B56576]">
                  in {m.location}
                </span>
              </div>
              <div className="text-[12px] text-[#828282]">{m.time}</div>
              <p className="text-[14px] mt-1 line-clamp-1">{m.preview}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
