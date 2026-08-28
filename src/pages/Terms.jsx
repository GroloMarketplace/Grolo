import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function Terms() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnToPreviousPage = () => location.key === "default" ? navigate("/signin", { replace: true }) : navigate(-1);

  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Terms of Service" onBack={returnToPreviousPage} hideProfile />
      <div className="flex-1 overflow-y-auto px-5 py-6 text-[14px] leading-6 text-[#4F5B51]">
        <div className="mx-auto max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Grolo Marketplace</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#202A21]">Terms of Service</h1>
          <p className="mt-2 text-[13px] text-[#748074]">Last updated August 2026</p>
          <div className="mt-6 space-y-5">
            <section><h2 className="font-semibold text-[#202A21]">Using Grolo</h2><p className="mt-1">Grolo helps local buyers and independent sellers connect. By using Grolo, you agree to use the marketplace lawfully, honestly, and respectfully.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Accounts</h2><p className="mt-1">Keep your account information accurate and protect your sign-in details. You are responsible for activity performed through your account.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Listings and transactions</h2><p className="mt-1">Sellers are responsible for accurate listings, availability, and fulfillment. Buyers are responsible for reviewing listing details and following agreed pickup or delivery arrangements.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Community standards</h2><p className="mt-1">Do not use Grolo for fraud, harassment, unsafe activity, prohibited goods, or content that violates another person’s rights. We may restrict accounts that violate these standards.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Contact</h2><p className="mt-1">If you have questions about these terms or a marketplace interaction, contact Grolo support through the app.</p></section>
          </div>
          <button type="button" onClick={returnToPreviousPage} className="mt-8 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">I Agree</button>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
