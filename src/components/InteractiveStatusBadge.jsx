import { useNavigate } from "react-router-dom";
import GroloStatusIcon from "./GroloStatusIcon";

export default function InteractiveStatusBadge({ status, className = "", prominent = false }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label={`Learn more about ${status.name}`}
      onClick={() => navigate("/grolo-statuses")}
      className={`group inline-flex w-fit items-center gap-1 rounded-md text-left font-medium text-[#498467] transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#498467] ${prominent ? "text-[20px]" : "mt-1 text-[13px]"} ${className}`}
    >
      <GroloStatusIcon name={status.icon} size={prominent ? 22 : 15} className={prominent ? "h-[22px] w-[22px]" : "h-[15px] w-[15px]"} />
      <span className="group-hover:underline">{status.name}</span>
      <span aria-hidden="true" className="text-[15px] opacity-60">›</span>
    </button>
  );
}
