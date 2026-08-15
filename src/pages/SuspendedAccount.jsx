import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileScreenLayout from "../components/MobileScreenLayout";
import { useAuth } from "../context/AuthContext";

export default function SuspendedAccount() {
  const navigate = useNavigate();
  const { user, isSuspended, profileStatus, signOut } = useAuth();

  useEffect(() => {
    if (user && profileStatus === "loaded" && !isSuspended) navigate("/", { replace: true });
  }, [isSuspended, navigate, profileStatus, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  return (
    <MobileScreenLayout>
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF1F0] text-3xl font-semibold text-[#B42318]">!</div>
        <h1 className="mt-6 text-[24px] font-semibold">Account Restricted</h1>
        <p className="mt-3 max-w-sm text-[14px] leading-6 text-[#4F4F4F]">
          Your Grolo account has been suspended. Access to marketplace and community actions is currently restricted.
        </p>
        <p className="mt-3 max-w-sm text-[13px] leading-5 text-[#828282]">
          If you believe this was a mistake, contact Grolo support from your account administration channel.
        </p>
        <button type="button" onClick={handleSignOut} className="mt-8 w-full max-w-sm rounded-lg bg-[#498467] py-3.5 text-[16px] font-medium text-white">Sign Out</button>
      </div>
    </MobileScreenLayout>
  );
}
