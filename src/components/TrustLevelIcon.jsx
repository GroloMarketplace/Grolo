const ICONS = {
  sprout: (
    <>
      <path d="M12 20V11" />
      <path d="M12 14C8.3 14 6.5 11.8 6.5 8.5c3.7 0 5.5 1.8 5.5 5.5Z" fill="#CFF7D3" />
      <path d="M12 11c0-3.7 2.1-5.8 5.8-5.8 0 3.8-2.1 5.8-5.8 5.8Z" fill="#E4F5D7" />
      <path d="M8.5 20h7" />
    </>
  ),
  leaf: (
    <>
      <path d="M5.5 17.5C6.1 10.7 10.1 6 18.5 5.5c-.5 8.4-5.2 12.4-12 13Z" fill="#CFF7D3" />
      <path d="M6.5 17.5c3.1-3.2 6.2-5.8 10.2-8.3" />
      <path d="M6.5 17.5 5 19" />
    </>
  ),
  tree: (
    <>
      <path d="M12 20v-6.5" />
      <path d="M9 20h6" />
      <path d="M12 14.5c-2.8 0-4.8-1.9-4.8-4.4 0-2.2 1.6-3.8 3.8-4.2.2-1.8 1.4-3.1 3-3.1 1.8 0 3.1 1.5 3.1 3.5 2.1.5 3.5 2.1 3.5 4.2 0 2.5-2 4.4-4.8 4.4H12Z" fill="#CFF7D3" />
      <path d="M12 9.5c-1.8-1.1-3.3-1.3-5-1" />
      <path d="M12 11c1.7-1.2 3.3-1.7 5.2-1.5" />
    </>
  ),
  star: (
    <>
      <path d="m12 3 2.1 5.7 5.9.4-4.5 3.8 1.5 5.7-5-3.1-5 3.1 1.5-5.7L4 9.1l5.9-.4L12 3Z" fill="#E4F5D7" />
      <circle cx="12" cy="11.6" r="1.4" fill="#D7A84B" stroke="none" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 5h10v3.5a5 5 0 0 1-10 0V5Z" fill="#FFF2CC" />
      <path d="M7 7H5.8a2.2 2.2 0 0 0 0 4.4H8M17 7h1.2a2.2 2.2 0 0 1 0 4.4H16" />
      <path d="M12 13.5V17m-2.5 2h5" />
      <path d="M12 5v4" stroke="#D7A84B" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20.2s-7.4-4.7-7.4-9.6A4.1 4.1 0 0 1 12 7.9a4.1 4.1 0 0 1 7.4 2.7c0 4.9-7.4 9.6-7.4 9.6Z" fill="#E4F5D7" />
      <path d="M12 7.9C9.8 5.1 6 5.8 4.9 8.8" stroke="#D7A84B" />
    </>
  ),
  diamond: (
    <>
      <path d="m12 2.8 7.2 6.1L12 21.2 4.8 8.9 12 2.8Z" fill="#E4F5D7" />
      <path d="m4.8 8.9 4.3.2 2.9-6.3 2.9 6.3 4.3-.2M9.1 9.1 12 21.2l2.9-12.1" />
      <path d="M10.1 14.8c1.3-2.1 2.8-3.1 4.7-3.3-.2 2.2-1.6 3.4-4.7 3.3Z" fill="#D7A84B" stroke="none" />
    </>
  ),
};

export default function TrustLevelIcon({ name, className = "h-6 w-6", color = "#498467" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.35" className={className}>
      {ICONS[name] ?? ICONS.sprout}
    </svg>
  );
}
