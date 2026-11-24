import { useSellerSettings } from "../context/SellerSettingsContext";

function OfficialCheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5Z"
        fill="#498467"
      />
    </svg>
  );
}

export default function OfficialBadge({ accountId, sellerId, authorId, userId, className = "" }) {
  const { getSellerProfile } = useSellerSettings();
  const id = accountId ?? sellerId ?? authorId ?? userId;
  const official = Boolean(id && getSellerProfile(id)?.isOfficial);

  if (!official) return null;

  return (
    <span
      title="Official Grolo Marketplace Account"
      aria-label="Official Grolo Marketplace Account"
      className={`inline-flex shrink-0 items-center ${className}`}
    >
      <OfficialCheckIcon />
    </span>
  );
}
