import { MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LOCATION_OPTIONS, friendlyLocation } from "../data/locations";

export default function LocationAutocomplete({ label = "Location", value = "", location = null, onChange, required = false, placeholder = "Search neighborhood, city, or postal code" }) {
  const [query, setQuery] = useState(location ? friendlyLocation(location) : value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(location ? friendlyLocation(location) : value);
  }, [location, value]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return LOCATION_OPTIONS.slice(0, 6);
    return LOCATION_OPTIONS.filter((option) => [option.neighborhood, option.city, option.province, option.postalCode].filter(Boolean).some((field) => field.toLowerCase().includes(normalized))).slice(0, 6);
  }, [query]);

  const selectLocation = (option) => {
    setQuery(friendlyLocation(option));
    setOpen(false);
    onChange(option);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);
      if (!location) setQuery(value);
    }, 120);
  };

  return (
    <div className="relative flex flex-col gap-2 text-[14px] font-medium">
      <label htmlFor={`location-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{label}</label>
      <div className="relative">
        <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#498467]" strokeWidth={1.8} />
        <input
          id={`location-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          required={false}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); if (location) onChange(null); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-[#DCEBE0] bg-white py-3 pl-9 pr-9 text-[14px] font-normal outline-none transition-colors focus:border-[#498467] focus:ring-2 focus:ring-[#EAF5ED]"
        />
        {required && <input tabIndex={-1} aria-hidden="true" value={location?.id ?? (value ? "legacy-location" : "")} required={!value} readOnly className="pointer-events-none absolute h-0 w-0 opacity-0" />}
        {query && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); setOpen(false); onChange(null); }} aria-label={`Clear ${label.toLowerCase()}`} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#789083]"><X className="h-4 w-4" /></button>}
      </div>
      {open && matches.length > 0 && (
        <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-xl border border-[#DCEBE0] bg-white p-1 shadow-[0_8px_24px_rgba(31,90,69,0.14)]">
          {matches.map((option) => (
            <button key={option.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLocation(option)} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-[#F1F8F2]">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#498467]" strokeWidth={1.8} />
              <span><span className="block text-[13px] font-semibold text-[#1F2D27]">{option.neighborhood || option.city}</span><span className="block text-[11px] font-normal text-[#828282]">{[option.neighborhood && option.city, option.province, option.postalCode].filter(Boolean).join(" · ")}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
