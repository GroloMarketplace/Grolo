import TabBar from "./TabBar";

export default function PhoneFrame({ children, hideTabBar }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#efefef] py-6">
      <div className="relative w-full max-w-[375px] min-h-[812px] bg-white overflow-hidden shadow-xl flex flex-col">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
          {children}
        </div>
        {!hideTabBar && <TabBar />}
      </div>
    </div>
  );
}
