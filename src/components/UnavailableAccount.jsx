import MobileScreenLayout from "./MobileScreenLayout";

export default function UnavailableAccount({ onBack, message }) {
  return <MobileScreenLayout><div className="flex min-h-full flex-col items-center justify-center px-6 text-center">{message && <p role="status" className="mb-3 rounded-lg bg-[#F5FFF6] px-3 py-2 text-[13px] font-medium text-[#498467]">{message}</p>}<h1 className="text-[20px] font-semibold">This account is unavailable.</h1><p className="mt-2 text-[14px] text-[#828282]">This account and its content are not available to you.</p>{onBack && <button type="button" onClick={onBack} className="mt-5 rounded-lg border border-[#498467] px-5 py-3 text-[14px] font-medium text-[#498467]">Go Back</button>}</div></MobileScreenLayout>;
}
