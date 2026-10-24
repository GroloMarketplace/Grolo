import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

const rules = [
  "No harassment or bullying",
  "No hate speech",
  "No threats or intimidation",
  "No fraud or scams",
  "No illegal products or services",
  "No explicit or offensive content",
];

export default function CommunityGuidelines() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnToPreviousPage = () => location.key === "default" ? navigate("/signin", { replace: true }) : navigate(-1);

  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Community Guidelines" onBack={returnToPreviousPage} hideProfile />
      <div className="flex-1 overflow-y-auto px-5 py-6 text-[14px] leading-6 text-[#4F5B51]">
        <div className="mx-auto max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Grolo Marketplace</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#202A21]">Community Guidelines</h1>
          <p className="mt-2 text-[13px] text-[#748074]">Last updated October 2026</p>
          <p className="mt-6">Grolo is a community marketplace. Treat people with respect, keep activity honest, and help us maintain a safe experience for everyone.</p>
          <section className="mt-6">
            <h2 className="font-semibold text-[#202A21]">Not tolerated on Grolo</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ul>
          </section>
          <section className="mt-6">
            <h2 className="font-semibold text-[#202A21]">Enforcement</h2>
            <p className="mt-1">Violations may result in content removal and permanent account suspension. We may also limit features, remove listings, or report illegal activity to the appropriate authorities.</p>
          </section>
          <button type="button" onClick={returnToPreviousPage} className="mt-8 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">I Understand</button>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
