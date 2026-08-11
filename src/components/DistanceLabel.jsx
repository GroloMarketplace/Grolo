import { useBuyerSettings } from "../context/BuyerSettingsContext";
import OutlineIcon from "./OutlineIcon";
import { distanceInfo, resolveUserLocation } from "../utils/locationRadius";

export default function DistanceLabel({ content, className = "" }) {
  const { settings = {} } = useBuyerSettings();
  const userLocation = resolveUserLocation(settings);
  const { label, hasDistance } = distanceInfo(content ?? {}, userLocation);
  // Same signature Grolo location icon everywhere; only the color (and a
  // slight emphasis for real distances) changes: green + bolder when we know
  // how far away something is, grey/neutral when we're just showing a place name.
  const colorClass = hasDistance ? "text-[#498467] font-medium" : "text-[#828282]";
  return <span className={`inline-flex items-center gap-1 text-[12px] ${colorClass} ${className}`}><OutlineIcon name="location" size={hasDistance ? 14 : 13} />{label}</span>;
}
