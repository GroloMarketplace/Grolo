import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function Privacy() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnToPreviousPage = () => location.state?.returnTo
    ? navigate(location.state.returnTo, { replace: true, state: { allowSignup: location.state.allowSignup, signupDraft: location.state.signupDraft } })
    : location.key === "default" ? navigate("/signin", { replace: true }) : navigate(-1);

  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Privacy Policy" onBack={returnToPreviousPage} hideProfile />
      <div className="flex-1 overflow-y-auto px-5 py-6 text-[14px] leading-6 text-[#4F5B51]">
        <div className="mx-auto max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Grolo Marketplace</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#202A21]">Privacy Policy</h1>
          <p className="mt-2 text-[13px] text-[#748074]">Last updated August 2026</p>
          <div className="mt-6 space-y-5">
            <section><h2 className="font-semibold text-[#202A21]">Information we collect</h2><p className="mt-1">We collect the information you provide for your account, profile, listings, orders, messages, and community activity. We also collect basic usage information needed to operate and improve Grolo.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">How we use information</h2><p className="mt-1">We use your information to provide marketplace features, connect buyers and sellers, process activity, protect the community, and communicate important account updates.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">What is shared</h2><p className="mt-1">Information on your public profile and listings may be visible to other community members. We share information with service providers only when needed to operate Grolo and protect the marketplace.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Your choices</h2><p className="mt-1">You can update your profile information and available privacy settings in Account Settings. You may contact Grolo support with questions about your information.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Security and retention</h2><p className="mt-1">We use reasonable safeguards for account information and retain information only as needed for marketplace operations, safety, legal obligations, and dispute resolution.</p></section>
          </div>
          <button type="button" onClick={returnToPreviousPage} className="mt-8 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">I Agree</button>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
