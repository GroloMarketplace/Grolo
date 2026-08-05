export default function ProfileAvatar({ profile, size = "w-8 h-8", className = "" }) {
  const label = (profile?.name ?? "User").trim().charAt(0).toUpperCase() || "U";
  return profile?.avatar
    ? <img src={profile.avatar} alt={profile.name ?? "User"} className={`${size} rounded-full object-cover ${className}`} />
    : <span className={`${size} flex items-center justify-center rounded-full bg-[#E6DCCF] text-[14px] font-semibold text-[#498467] ${className}`} aria-label={profile?.name ?? "User"}>{label}</span>;
}
