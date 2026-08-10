import { useBuyerSettings } from "../context/BuyerSettingsContext";
import OutlineIcon from "./OutlineIcon";
import { distanceInfo, resolveUserLocation } from "../utils/locationRadius";

export default function DistanceLabel({ content, className = "" }) {
  const { settings = {} } = useBuyerSettings();
  const userLocation = resolveUserLocation(settings);
  const { label, hasDistance } = distanceInfo(content ?? {}, userLocation);
  const colorClass = hasDistance ? "text-[#498467]" : "text-[#828282]";
  return <span className={`inline-flex items-center gap-1 text-[12px] ${colorClass} ${className}`}><OutlineIcon name="location" size={13} />{label}</span>;
}
