import { useState } from "react";
import { createPortal } from "react-dom";
import { formatListingPrice } from "../utils/listingDisplay";
import TradeBadge from "./TradeBadge";

export default function AttachListingModal({ listings, selectedListingId, selectedListingIds, onSelect, onClose }) {
  const [pendingIds, setPendingIds] = useState(() => selectedListingIds ?? (selectedListingId ? [selectedListingId] : []));
  const pendingListings = listings.filter((listing) => pendingIds.includes(listing.id));

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attach-listing-title">
      <section className="flex max-h-[75dvh] min-h-0 w-full max-w-[420px] flex-col rounded-2xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <h2 id="attach-listing-title" className="text-[18px] font-semibold">Attach Listing</h2>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto no-scrollbar">
          {listings.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#828282]">You don't have any listings yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {listings.map((listing) => {
                const checked = pendingIds.includes(listing.id);
                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setPendingIds((current) => checked ? current.filter((id) => id !== listing.id) : [...current, listing.id])}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left ${checked ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6]"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-[#498467] bg-[#498467]" : "border-[#828282]"}`}>
                      {checked && <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5 6.5-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {listing.image && <img src={listing.image} alt={listing.name} className="h-10 w-10 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{listing.name}</p>
                      <p className="text-[12px] text-[#498467]">{formatListingPrice(listing)}</p>
                      <TradeBadge listing={listing} compact className="mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-5 flex shrink-0 gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#E6E6E6] py-3 text-[14px] font-medium">Cancel</button>
          <button
            type="button"
            disabled={!pendingListings.length}
            onClick={() => pendingListings.length && onSelect(pendingListings)}
            className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Attach Listings{pendingListings.length ? ` (${pendingListings.length})` : ""}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
