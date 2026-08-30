import { MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LOCATION_OPTIONS, friendlyLocation } from "../data/locations";

const GEOCODING_URL = import.meta.env.VITE_GEOCODING_URL || "https://nominatim.openstreetmap.org/search";
const PROVINCE_ABBREVIATIONS = { Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS", Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC", Saskatchewan: "SK", Yukon: "YT" };

function normalizeResult(result) {
  const address = result.address ?? {};
  const city = address.city || address.town || address.village || address.municipality || address.county || "";
  const province = address.state || address.province || address.region || "";
  const country = address.country || "Canada";
  const postalCode = address.postcode || "";
  const hasStreet = address.house_number || address.road || address.pedestrian;
  const placeType = `${result.class || ""}:${result.type || ""}`;
  const isCityPlace = /place:(city|town|village|municipality)|boundary:administrative/.test(placeType);
  const scope = address.country_code === "ca" && !city && address.state ? "province" : city && (!hasStreet || isCityPlace) ? "city" : "address";
  return {
    id: `geocode-${result.place_id}`,
    label: result.display_name,
    neighborhood: address.suburb || address.neighbourhood || "",
    city,
    province,
    country,
    postalCode,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    scope,
  };
}

function optionLabel(option) {
  if (option.scope === "city") return `${option.city}, ${PROVINCE_ABBREVIATIONS[option.province] || option.province} (Entire City)`;
  if (option.label) return option.label;
  return `${friendlyLocation(option)}${option.scope === "province" ? " (Province Wide)" : ""}`;
}

function addDynamicCityOptions(results) {
  const cities = results.filter((option) => option.city && option.province).map((option) => ({
    id: `city-${option.city.toLowerCase()}-${option.province.toLowerCase()}`,
    city: option.city,
    province: option.province,
    country: option.country,
    latitude: option.latitude,
    longitude: option.longitude,
    scope: "city",
  }));
  return [...cities, ...results];
}

export default function LocationAutocomplete({ label = "Location", value = "", location = null, locations = [], multiple = false, onChange, required = false, placeholder = "Search Canadian address, city, or postal code" }) {
  const selectedLocations = useMemo(() => (multiple ? locations : location ? [location] : []), [multiple, locations, location]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remoteMatches, setRemoteMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!multiple) setQuery(location ? optionLabel(location) : value);
  }, [location, value, multiple]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setRemoteMatches([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL(GEOCODING_URL);
        url.searchParams.set("q", normalized);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("countrycodes", "ca");
        url.searchParams.set("limit", "8");
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Location lookup failed");
        setRemoteMatches(addDynamicCityOptions((await response.json()).map(normalizeResult)));
      } catch (error) {
        if (error.name !== "AbortError") setRemoteMatches([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = normalized ? [...remoteMatches, ...LOCATION_OPTIONS] : LOCATION_OPTIONS;
    const unique = source.filter((option, index, all) => all.findIndex((candidate) => candidate.id === option.id || (candidate.scope === "city" && option.scope === "city" && candidate.city === option.city && candidate.province === option.province) || (candidate.city === option.city && candidate.province === option.province && candidate.postalCode === option.postalCode)) === index);
    return unique
      .filter((option) => !selectedLocations.some((selected) => selected.id === option.id))
      .sort((a, b) => (a.scope === "city" ? 0 : 1) - (b.scope === "city" ? 0 : 1))
      .slice(0, 8);
  }, [query, remoteMatches, selectedLocations]);

  const selectLocation = (option) => {
    const nextLocations = multiple ? [...selectedLocations, option] : [option];
    setQuery("");
    setOpen(multiple);
    onChange(multiple ? nextLocations : option);
  };

  const removeLocation = (optionId) => onChange(multiple ? selectedLocations.filter((option) => option.id !== optionId) : null);
  const handleBlur = () => window.setTimeout(() => { setOpen(false); if (!multiple && !location) setQuery(value); }, 120);
  const inputId = `location-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="relative flex flex-col gap-2 text-[14px] font-medium">
      <label htmlFor={inputId}>{label}</label>
      {multiple && selectedLocations.length > 0 && <div className="mb-2 flex flex-wrap gap-2">
        {selectedLocations.map((option) => <span key={option.id} className="inline-flex items-center gap-1 rounded-full bg-[#F1F8F2] px-3 py-1.5 text-[12px] font-normal text-[#315D47]">{optionLabel(option)}<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => removeLocation(option.id)} aria-label={`Remove ${friendlyLocation(option)}`}><X className="h-3 w-3" /></button></span>)}
      </div>}
      <div className="relative">
        <MapPin aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#498467]" strokeWidth={1.8} />
        <input id={inputId} required={false} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); if (!multiple && location) onChange(null); }} onFocus={() => setOpen(true)} onBlur={handleBlur} placeholder={placeholder} autoComplete="off" className="w-full rounded-xl border border-[#DCEBE0] bg-white py-3 pl-9 pr-9 text-[14px] font-normal outline-none transition-colors focus:border-[#498467] focus:ring-2 focus:ring-[#EAF5ED]" />
        {required && <input tabIndex={-1} aria-hidden="true" value={multiple ? selectedLocations.map((option) => option.id).join(",") : location?.id ?? (value ? "legacy-location" : "")} required={multiple ? selectedLocations.length === 0 : !value} readOnly className="pointer-events-none absolute h-0 w-0 opacity-0" />}
        {(query || loading) && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); setOpen(false); if (multiple) onChange(selectedLocations); else onChange(null); }} aria-label={`Clear ${label.toLowerCase()}`} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#789083]"><X className="h-4 w-4" /></button>}
      </div>
      {open && matches.length > 0 && <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-xl border border-[#DCEBE0] bg-white p-1 shadow-[0_8px_24px_rgba(31,90,69,0.14)]">
        {matches.map((option) => <button key={option.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLocation(option)} className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-[#F1F8F2]"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#498467]" strokeWidth={1.8} /><span><span className="block text-[13px] font-semibold text-[#1F2D27]">{optionLabel(option)}</span><span className="block text-[11px] font-normal text-[#828282]">{[option.neighborhood, option.city, option.province, option.postalCode].filter(Boolean).join(" · ")}</span></span></button>)}
      </div>}
      {open && loading && <p className="text-[12px] font-normal text-[#828282]">Searching Canadian locations…</p>}
      {open && !loading && query.trim() && matches.length === 0 && <p className="text-[12px] font-normal text-[#828282]">No Canadian locations found.</p>}
    </div>
  );
}
