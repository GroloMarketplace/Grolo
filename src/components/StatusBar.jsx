export default function StatusBar() {
  return (
    <div className="h-11 flex items-center justify-between px-6">
      <div className="text-[16px] font-semibold tracking-tight">
        9:41
      </div>
      <div className="flex items-center gap-2">
        {/* Signal icon */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
          <path d="M1 11H3V7H1V11Z" fill="black"/>
          <path d="M5 11H7V5H5V11Z" fill="black"/>
          <path d="M9 11H11V3H9V11Z" fill="black"/>
          <path d="M13 11H15V1H13V11Z" fill="black"/>
        </svg>
        {/* WiFi icon */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 0C4.68629 0 2 2.68629 2 6H4C4 3.79086 5.79086 2 8 2C10.2091 2 12 3.79086 12 6H14C14 2.68629 11.3137 0 8 0Z" fill="black"/>
          <path d="M8 3C5.79086 3 4 4.79086 4 7H6C6 5.89543 6.89543 5 8 5C9.10457 5 10 5.89543 10 7H12C12 4.79086 10.2091 3 8 3Z" fill="black"/>
          <path d="M8 6C7.44772 6 7 6.55228 7 6C7 5.44772 7.44772 5 8 5C8.55228 5 9 5.44772 9 6C9 6.55228 8.55228 7 8 7Z" fill="black"/>
        </svg>
        {/* Battery icon */}
        <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
          <rect x="1" y="2" width="20" height="8" rx="2" stroke="black" strokeWidth="1.5"/>
          <rect x="22" y="4" width="1" height="4" rx="0.5" fill="black"/>
          <rect x="3" y="4" width="14" height="4" rx="1" fill="black"/>
        </svg>
      </div>
    </div>
  );
}
