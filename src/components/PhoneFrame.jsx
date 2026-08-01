import TabBar from "./TabBar";
import StatusBar from "./StatusBar";
import MobileScreenLayout from "./MobileScreenLayout";

export default function PhoneFrame({ children, hideTabBar, backgroundColor = "bg-white" }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#efefef] py-6">
      <div className={`relative w-full max-w-[375px] h-[812px] ${backgroundColor} overflow-hidden shadow-xl flex flex-col no-scroll-x`}>
        <StatusBar backgroundColor={backgroundColor} />
        <div className="flex-1 overflow-x-hidden pb-20 relative">
          <MobileScreenLayout>
            {children}
          </MobileScreenLayout>
        </div>
        {!hideTabBar && <TabBar />}
      </div>
    </div>
  );
}
