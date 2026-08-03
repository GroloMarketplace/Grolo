export default function SearchBar({ placeholder = "Search", value, onChange }) {
  return (
    <div className="mx-4 flex items-center gap-3 rounded-lg bg-[#F5F5F5] px-3 py-2 h-10">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <path
          d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
          stroke="#828282"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 21l-4.35-4.35"
          stroke="#828282"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-[16px] text-[#828282] placeholder:text-[#828282] outline-none"
      />
    </div>
  );
}
