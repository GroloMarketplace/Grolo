export default function ShareProfileButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share seller profile"
      title="Share seller profile"
      className="flex h-8 w-8 items-center justify-center rounded-full text-[#498467] transition-colors hover:bg-[#F5FFF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
      </svg>
    </button>
  );
}
