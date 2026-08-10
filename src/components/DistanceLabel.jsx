import { useBuyerSettings } from "../context/BuyerSettingsContext";
import OutlineIcon from "./OutlineIcon";
import { distanceLabel } from "../utils/locationRadius";

export default function DistanceLabel({ content, className = "" }) {
  const { settings = {} } = useBuyerSettings();
  const userLocation = settings.latitude ? settings : settings.location;
  return <span className={`inline-flex items-center gap-1 text-[12px] text-[#498467] ${className}`}><OutlineIcon name="location" size={13} />{distanceLabel(content ?? {}, userLocation)}</span>;
}
