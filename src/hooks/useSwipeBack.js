import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EDGE_WIDTH = 30;
const TRIGGER_DISTANCE = 60;
const MAX_VERTICAL_DRIFT = 80;

function isSwipeIgnored(target) {
  return target instanceof Element && Boolean(target.closest(".snap-x, .overflow-x-auto, [data-swipe-ignore]"));
}

function supportsSwipeBack(pathname) {
  return pathname === "/comments"
    || pathname === "/checkout"
    || pathname === "/order-confirmation"
    || pathname === "/delivery-address"
    || pathname === "/orders"
    || pathname.startsWith("/orders/")
    || pathname === "/my-shop/orders"
    || pathname === "/my-shop/advertising"
    || pathname.startsWith("/my-shop/advertising/")
    || pathname === "/analytics"
    || pathname === "/profit"
    || pathname === "/account-settings"
    || pathname === "/product/"
    || pathname.startsWith("/product/")
    || pathname.startsWith("/listing/")
    || pathname.startsWith("/seller/")
    || pathname.startsWith("/category/")
    || pathname === "/featured"
    || pathname === "/trading"
    || pathname === "/community-impact"
    || pathname === "/my-shop/reviews"
    || pathname === "/my-shop/events"
    || pathname === "/create-event"
    || pathname === "/create-promotion"
    || pathname === "/create-listing"
    || pathname.startsWith("/edit-listing/")
    || pathname === "/create-post"
    || pathname.startsWith("/leave-review/")
    || pathname.startsWith("/product/") && pathname.endsWith("/reviews");
}

export function useSwipeBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const startRef = useRef(null);

  const goBack = useCallback(() => {
    const { pathname, state } = location;
    if (["/my-shop/orders", "/my-shop/advertising", "/analytics", "/profit"].includes(pathname)) {
      navigate("/shop", { state: { openSellerMenu: true } });
      return;
    }
    if (pathname === "/account-settings" && state?.fromSellerMenu) {
      navigate("/shop", { state: { openSellerMenu: true } });
      return;
    }
    if (pathname === "/create-listing" || pathname.startsWith("/edit-listing/")) {
      navigate("/shop");
      return;
    }
    if (pathname === "/create-post") {
      navigate("/my-shop");
      return;
    }
    if (pathname === "/create-event") {
      navigate("/my-shop/events");
      return;
    }
    if (pathname === "/create-promotion" || pathname === "/my-shop/events" || pathname === "/my-shop/reviews") {
      navigate("/shop");
      return;
    }
    if (pathname.startsWith("/my-shop/advertising/")) {
      navigate("/my-shop/advertising");
      return;
    }
    if (pathname === "/orders" || pathname.startsWith("/orders/")) {
      navigate(pathname === "/orders" ? -1 : "/orders");
      return;
    }
    if (pathname === "/checkout") {
      navigate("/cart");
      return;
    }
    if (pathname.startsWith("/checkout/")) {
      navigate("/checkout");
      return;
    }
    if (pathname === "/order-confirmation" && state?.sellerId) {
      navigate(`/checkout/${state.sellerId}`);
      return;
    }
    navigate(-1);
  }, [location, navigate]);

  const handleTouchStart = useCallback((event) => {
    if (!supportsSwipeBack(location.pathname) || isSwipeIgnored(event.target)) {
      startRef.current = null;
      return;
    }
    const touch = event.touches[0];
    if (touch.clientX <= EDGE_WIDTH) startRef.current = { x: touch.clientX, y: touch.clientY };
    else startRef.current = null;
  }, [location.pathname]);

  const handleTouchEnd = useCallback((event) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (touch.clientX - start.x >= TRIGGER_DISTANCE && Math.abs(touch.clientY - start.y) <= MAX_VERTICAL_DRIFT) goBack();
  }, [goBack]);

  return { handleTouchStart, handleTouchEnd };
}
