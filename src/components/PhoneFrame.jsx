import TabBar from "./TabBar";
import MobileScreenLayout from "./MobileScreenLayout";
import { useRegrow } from "../context/RegrowContext";
import { useSavedItems } from "../context/SavedContext";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { useLocation } from "react-router-dom";

export default function PhoneFrame({ children, hideTabBar, backgroundColor = "bg-white" }) {
  const { pathname } = useLocation();
  const { toast } = useRegrow();
  const { toast: savedToast } = useSavedItems();
  const { handleTouchStart, handleTouchEnd } = useSwipeBack();
  const activeToast = toast ? { message: toast.message, visible: toast.visible, style: "bg-[#498467]" } : savedToast ? { message: savedToast, visible: true, style: "bg-[#1E1E1E]" } : null;
  return (
    <div className="min-h-[100svh] w-full bg-[#efefef]">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`app-frame relative flex h-[100svh] min-h-[100svh] w-full max-w-full flex-col overflow-hidden ${backgroundColor} no-scroll-x`}
      >
        <div className={`relative flex-1 overflow-x-hidden ${hideTabBar ? "pb-[env(safe-area-inset-bottom)]" : "pb-[calc(5rem+env(safe-area-inset-bottom))]"}`}>
          <MobileScreenLayout key={pathname}>
            {children}
          </MobileScreenLayout>
        </div>
        {!hideTabBar && <TabBar />}
        {activeToast && (
          <div
            className={`pointer-events-none absolute bottom-[76px] left-1/2 z-[100] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full ${activeToast.style} px-4 py-2 text-center text-[13px] font-medium text-white shadow-lg transition-all duration-300 ease-out ${
              activeToast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {activeToast.message}
          </div>
        )}
      </div>
    </div>
  );
}
