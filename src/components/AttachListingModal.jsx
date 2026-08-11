import { useState } from "react";
import { formatListingPrice } from "../utils/listingDisplay";

export default function AttachListingModal({ listings, selectedListingId, onSelect, onClose }) {
  const [pendingId, setPendingId] = useState(selectedListingId ?? null);
  const pendingListing = listings.find((listing) => listing.id === pendingId);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attach-listing-title">
      <section className="flex max-h-[80vh] w-full max-w-[420px] flex-col rounded-2xl bg-white p-5 shadow-2xl">
        <h2 id="attach-listing-title" className="text-[18px] font-semibold">Attach Listing</h2>
        <div className="mt-4 flex-1 overflow-y-auto no-scrollbar">
          {listings.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-[#828282]">You don't have any listings yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {listings.map((listing) => {
                const checked = pendingId === listing.id;
                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => setPendingId(checked ? null : listing.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left ${checked ? "border-[#498467] bg-[#F5FFF6]" : "border-[#E6E6E6]"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? "border-[#498467] bg-[#498467]" : "border-[#828282]"}`}>
                      {checked && <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5 6.5-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    {listing.image && <img src={listing.image} alt={listing.name} className="h-10 w-10 rounded-lg object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{listing.name}</p>
                      <p className="text-[12px] text-[#498467]">{formatListingPrice(listing)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#E6E6E6] py-3 text-[14px] font-medium">Cancel</button>
          <button
            type="button"
            disabled={!pendingListing}
            onClick={() => pendingListing && onSelect(pendingListing)}
            className="flex-1 rounded-lg bg-[#498467] py-3 text-[14px] font-medium text-white disabled:opacity-50"
          >
            Select
          </button>
        </div>
      </section>
    </div>
  );
}
