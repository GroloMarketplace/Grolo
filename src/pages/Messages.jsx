import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { messages, sellers } from "../data/mockData";

const TABS = [
  { name: "All", count: 5 },
  { name: "Selling", count: 1 },
  { name: "Buying", count: 3 },
  { name: "Orders", count: 1 },
];

export default function Messages() {
  const [tab, setTab] = useState("All");
  const navigate = useNavigate();

  const filteredMessages = tab === "All"
    ? messages
    : messages.filter((m) => m.category === tab);

  return (
    <div>
      <div className="py-3">
        <SearchBar />
      </div>
      <div className="flex gap-2 px-4 pb-3">
        {TABS.map((t) => (
          <button
            key={t.name}
            onClick={() => setTab(t.name)}
            className={`px-3 py-1.5 rounded-md text-[14px] font-medium border relative ${
              tab === t.name
                ? "bg-[#498467] text-white border-[#498467]"
                : "bg-white text-black/90 border-[#E6E6E6]"
            }`}
          >
            {t.name}
            {t.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#498467] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-12">
            <p className="text-[14px] text-[#828282]">No conversations found</p>
          </div>
        ) : (
          filteredMessages.map((m) => (
            <div
              key={m.id}
              className="flex gap-3 px-4 py-3 border-b border-black/5 relative"
            >
              <button
                onClick={() => navigate(`/messages/${m.id}`)}
                className="flex-1 flex gap-3 text-left"
              >
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80"
                  alt={m.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <Link
                      to={`/seller/${Object.values(sellers).find((s) => s.name === m.name)?.id || 'sarahs-backyard'}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[14px] ${m.unread ? "font-bold" : "font-semibold"} text-[#498467] hover:underline`}
                    >
                      {m.name}
                    </Link>
                    <span className="text-[14px] text-[#B56576]">
                      in {m.location}
                    </span>
                  </div>
                  <p className="text-[14px] mt-1 line-clamp-1">{m.preview}</p>
                </div>
              </button>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[12px] text-[#828282]">{m.timestamp}</span>
                {m.unread && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#498467] shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
