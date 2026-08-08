import TrustLevelIcon from "./TrustLevelIcon";
import OutlineIcon from "./OutlineIcon";

const ICON_NAMES = {
  sprout: "sprout",
  leaf: "leaf",
  tree: "tree",
  heart: "heart",
  trophy: "trophy",
};

export default function GroloStatusIcon({ name, className = "h-6 w-6", size }) {
  if (!ICON_NAMES[name]) return <OutlineIcon name={name} size={size ?? 18} className={className} />;
  return <TrustLevelIcon name={ICON_NAMES[name]} className={className} color={name === "trophy" ? "#D7A84B" : "#498467"} />;
}
