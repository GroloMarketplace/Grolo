export default function ProfileAvatar({ profile, size = "w-8 h-8", className = "" }) {
  return profile?.avatar
    ? <img src={profile.avatar} alt={profile.name ?? "User"} className={`${size} rounded-full object-cover ${className}`} />
    : <span className={`${size} flex items-center justify-center rounded-full bg-[#498467] text-white ${className}`} aria-label={profile?.name ?? "User"}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 20c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" strokeLinecap="round" />
      </svg>
    </span>;
}
