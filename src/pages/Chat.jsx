import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { chatMessages } from "../data/mockData";

export default function Chat() {
  const navigate = useNavigate();
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 h-14 px-4 border-b border-[#E6E6E6]">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M9.27 12 16.28 5a.5.5 0 0 0 0-.7l-.57-.57a.5.5 0 0 0-.7 0l-7.93 7.93a.5.5 0 0 0 0 .7l7.93 7.93a.5.5 0 0 0 .7 0l.57-.57a.5.5 0 0 0 0-.7L9.27 12Z"
              fill="black"
            />
          </svg>
        </button>
        <img
          src="https://images.unsplash.com/photo-1541823709867-1b206113eafd?w=100&q=80"
          alt="Helena Hills"
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="text-[16px] font-semibold">Helena Hills</div>
          <div className="text-[12px] text-black/50">Active 11m ago</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">
            Kira is interested{" "}
            <span className="text-[#B56576] font-normal">
              in Pennie’s Produce
            </span>
          </span>
          <img
            src="https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&q=80"
            alt="Pennie's Produce"
            className="w-full max-w-[207px] h-[184px] object-cover rounded"
          />
        </div>

        {chatMessages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-2xl text-[14px] font-medium ${
                m.from === "me"
                  ? "bg-[#498467] text-white rounded-br-md"
                  : "bg-[#E9E9EB] text-black rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div className="text-center text-[12px] text-[#828282]">
          Delivered
        </div>
      </div>

      <div className="p-2 border-t border-[#E6E6E6]">
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-[#E0E0E0]">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1 text-[14px] text-[#828282] outline-none"
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 20V4l19 8-19 8Z"
              fill="none"
              stroke="#828282"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
