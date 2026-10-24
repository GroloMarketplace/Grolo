import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function Terms() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnToPreviousPage = () => location.state?.returnTo
    ? navigate(location.state.returnTo, { replace: true, state: { allowSignup: location.state.allowSignup, signupDraft: location.state.signupDraft } })
    : location.key === "default" ? navigate("/signin", { replace: true }) : navigate(-1);

  return (
    <MobileScreenLayout className="bg-[#F8FBF7]">
      <Header title="Terms of Use" onBack={returnToPreviousPage} hideProfile />
      <div className="flex-1 overflow-y-auto px-5 py-6 text-[14px] leading-6 text-[#4F5B51]">
        <div className="mx-auto max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#498467]">Grolo Marketplace</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#202A21]">Terms of Use</h1>
          <p className="mt-2 text-[13px] text-[#748074]">Last updated August 2026</p>
          <div className="mt-6 space-y-5">
            <section><h2 className="font-semibold text-[#202A21]">Using Grolo</h2><p className="mt-1">Grolo helps local buyers and independent sellers connect. By using Grolo, you agree to use the marketplace lawfully, honestly, and respectfully.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Accounts</h2><p className="mt-1">Keep your account information accurate and protect your sign-in details. You are responsible for activity performed through your account.</p></section>
            <section><h2 className="font-semibold text-[#202A21]">Listings and transactions</h2><p className="mt-1">Sellers are responsible for accurate listings, availability, and fulfillment. Buyers are responsible for reviewing listing details and following agreed pickup or delivery arrangements.</p></section>
            <section>
              <h2 className="font-semibold text-[#202A21]">User Conduct and Community Standards</h2>
              <p className="mt-1 font-semibold text-[#202A21]">Grolo has zero tolerance for objectionable content or abusive users.</p>
              <p className="mt-2">Users may not post or share harassment, hate speech, threats, bullying, discriminatory content, fraudulent content, illegal goods, or sexually explicit or offensive material.</p>
              <p className="mt-2">Content that violates these standards may be removed without notice. Accounts engaging in abusive behavior may be suspended or permanently terminated. Reported content is reviewed by the Grolo moderation team. Grolo reserves the right to remove content and restrict access to protect community safety.</p>
              <button type="button" onClick={() => navigate("/community-guidelines", { state: location.state })} className="mt-3 font-semibold text-[#498467] underline underline-offset-2">Read the Community Guidelines</button>
            </section>
            <section><h2 className="font-semibold text-[#202A21]">Contact</h2><p className="mt-1">If you have questions about these terms or a marketplace interaction, contact Grolo support through the app.</p></section>
          </div>
          <button type="button" onClick={returnToPreviousPage} className="mt-8 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">I Agree</button>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
