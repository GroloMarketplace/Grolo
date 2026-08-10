import { useBuyerSettings } from "../context/BuyerSettingsContext";
import OutlineIcon from "./OutlineIcon";
import { distanceInfo } from "../utils/locationRadius";

export default function DistanceLabel({ content, className = "" }) {
  const { settings = {} } = useBuyerSettings();
  const userLocation = settings.latitude ? settings : settings.location;
  const { label, hasDistance } = distanceInfo(content ?? {}, userLocation);
  const colorClass = hasDistance ? "text-[#498467]" : "text-[#828282]";
  return <span className={`inline-flex items-center gap-1 text-[12px] ${colorClass} ${className}`}><OutlineIcon name="location" size={13} />{label}</span>;
}
