import TabBar from "./TabBar";
import StatusBar from "./StatusBar";
import MobileScreenLayout from "./MobileScreenLayout";
import { useRegrow } from "../context/RegrowContext";
import { useSwipeBack } from "../hooks/useSwipeBack";

export default function PhoneFrame({ children, hideTabBar, backgroundColor = "bg-white" }) {
  const { toast } = useRegrow();
  const { handleTouchStart, handleTouchEnd } = useSwipeBack();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#efefef] py-6">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`relative w-full max-w-[375px] h-[812px] ${backgroundColor} overflow-hidden shadow-xl flex flex-col no-scroll-x`}
      >
        <StatusBar backgroundColor={backgroundColor} />
        <div className="flex-1 overflow-x-hidden pb-20 relative">
          <MobileScreenLayout>
            {children}
          </MobileScreenLayout>
        </div>
        {!hideTabBar && <TabBar />}
        {toast && (
          <div
            className={`pointer-events-none absolute bottom-[76px] left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#498467] px-4 py-2 text-[13px] font-medium text-white shadow-lg transition-all duration-300 ease-out ${
              toast.visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
