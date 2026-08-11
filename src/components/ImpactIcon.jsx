// Shared Grolo Community Impact icon set (rounded, organic, consistent
// stroke weight) so the same icons appear both on the dedicated Community
// Impact page and inside profile stat cards. Falls back to the "star" shape
// for any unrecognized type so a bad icon name never breaks rendering.
const IMPACT_ICON_PATHS = {
  store: "M3 8.5 4.5 3h11L17 8.5M4 8.5h12v8H4v-8Zm3 8v-4h6v4",
  bag: "M4 6.5h12l-1 10H5l-1-10Zm3 0a3 3 0 0 1 6 0",
  calendar: "M4 5h12v12H4V5Zm3-2v4m6-4v4M4 8h12",
  heart: "M10 16.5S3 12.5 3 7.8a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4.7-7 8.7-7 8.7Z",
  star: "m10 2 2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L10 2Z",
  users: "M13.3 16.7v-1.3a3.3 3.3 0 0 0-3.3-3.3H5a3.3 3.3 0 0 0-3.3 3.3v1.3M5.8 8.7a2.9 2.9 0 1 0 0-5.9 2.9 2.9 0 0 0 0 5.9Zm8.4-5.4a2.5 2.5 0 0 1 0 4.8m1.1 1.3a3.3 3.3 0 0 1 3.3 3.3v1.3",
  user: "M10 10a3.3 3.3 0 1 0 0-6.7 3.3 3.3 0 0 0 0 6.7Zm-5 6.7v-.8a5 5 0 0 1 10 0v.8",
};

export default function ImpactIcon({ type, size = 20, className = "text-[#498467]" }) {
  const path = IMPACT_ICON_PATHS[type] ?? IMPACT_ICON_PATHS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
