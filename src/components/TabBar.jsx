import { NavLink } from "react-router-dom";
import { useProfileMode } from "../context/ProfileModeContext";

const tabs = [
  {
    to: "/",
    label: "Home",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.594 1.994c-.346-.283-.843-.283-1.189 0L1.343 10.244a1.1 1.1 0 0 0-.288 1.34c.133.373.487.622.883.622h1.457l.745 8.142c.074.804.748 1.42 1.556 1.42h3.49c.345 0 .625-.28.625-.625v-4.803c0-1.875 1.53-1.875 1.875-1.875h.625c.345 0 1.875 0 1.875 1.875v4.803c0 .345.28.625.625.625h3.49c.808 0 1.483-.616 1.556-1.42l.745-8.142h1.457c.396 0 .75-.25.883-.622a1.1 1.1 0 0 0-.288-1.34L12.594 1.994Z"
          fill="none"
          stroke={active ? "#498467" : "black"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: "/search",
    label: "Search",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 21l-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
          stroke={active ? "#498467" : "black"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: "/messages",
    label: "Messages",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4Zm8-7L4 8v10h16V8l-8 5Zm0-2 8-5H4l8 5Z"
          fill={active ? "#498467" : "#1D1B20"}
        />
      </svg>
    ),
  },
  {
    to: "/cart",
    label: "Cart",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M22.56 3c.7 0 1.18.7.94 1.35-.15.39-.52.65-.94.65h-.86a.5.5 0 0 0-.48.36l-3.16 10.93a1 1 0 0 1-.96.71H5.28a1 1 0 0 1-.92-.61L.58 7.39A1 1 0 0 1 1.5 6h13.99a1 1 0 0 1 .96 1.27A1 1 0 0 1 15.49 8H3.76a.5.5 0 0 0-.46.69L5.82 14.7a.5.5 0 0 0 .46.3h9.72a.5.5 0 0 0 .48-.36l3.1-10.91A1 1 0 0 1 20.56 3h2ZM8.5 18a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
          fill={active ? "#498467" : "black"}
        />
      </svg>
    ),
  },
  {
    to: "/shop",
    label: "Profile",
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          fill="none"
          stroke={active ? "#498467" : "black"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="7"
          r="4"
          fill="none"
          stroke={active ? "#498467" : "black"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function TabBar() {
  const { profileMode } = useProfileMode();
  const profilePath = profileMode === "buyer" ? "/profile" : "/shop";

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-0.5px_0_0_rgba(0,0,0,0.1)]">
      <div className="flex h-[64px]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to === "/shop" ? profilePath : tab.to === "/" ? { pathname: "/", state: { tab: "Your Community" } } : tab.to}
            end={tab.to === "/"}
            className="flex-1 flex items-center justify-center"
          >
            {({ isActive }) => tab.icon(isActive)}
          </NavLink>
        ))}
      </div>
      <div className="flex justify-center pb-2">
        <div className="w-[134px] h-[5px] rounded-full bg-black" />
      </div>
    </div>
  );
}
