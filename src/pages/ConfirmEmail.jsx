import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import MobileScreenLayout from "../components/MobileScreenLayout";

export default function ConfirmEmail() {
  const navigate = useNavigate();

  return (
    <MobileScreenLayout className="min-h-full overflow-y-auto bg-[#F8FBF7] px-6 py-8 sm:px-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <img src="/grolo-logo.svg" alt="Grolo" className="h-auto w-24 self-end" />
        <div className="my-auto py-10">
          <div className="rounded-2xl border border-[#C9DCCB] bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-3 text-[#498467]" size={34} />
            <h1 className="text-2xl font-semibold text-[#202A21]">Email Confirmed!</h1>
            <p className="mt-2 text-[15px] leading-6 text-[#687368]">Your account has been activated.</p>
            <button type="button" onClick={() => navigate("/signin", { replace: true })} className="mt-6 h-12 w-full rounded-xl bg-[#498467] text-[15px] font-semibold text-white shadow-sm">
              Proceed to Login
            </button>
          </div>
        </div>
      </div>
    </MobileScreenLayout>
  );
}
