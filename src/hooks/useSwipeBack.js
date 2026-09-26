import { useCallback, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EDGE_WIDTH = 44;
const TRIGGER_DISTANCE = 96;
const MAX_VERTICAL_DRIFT = 80;

function isSwipeIgnored(target) {
  return target instanceof Element && Boolean(target.closest("[data-swipe-ignore]"));
}

function supportsSwipeBack(pathname) {
  return pathname !== "/" && pathname !== "/home" && !["/signin", "/signup", "/onboarding"].includes(pathname);
}

export function useSwipeBack() {
  const location = useLocation();
  const navigate = useNavigate();
  const startRef = useRef(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const resetSwipe = useCallback(() => {
    startRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  }, []);

  const handleTouchStart = useCallback((event) => {
    if (event.touches.length !== 1 || !supportsSwipeBack(location.pathname) || isSwipeIgnored(event.target)) {
      resetSwipe();
      return;
    }
    const touch = event.touches[0];
    startRef.current = touch.clientX <= EDGE_WIDTH ? { x: touch.clientX, y: touch.clientY } : null;
  }, [location.pathname, resetSwipe]);

  const handleTouchMove = useCallback((event) => {
    const start = startRef.current;
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = Math.abs(touch.clientY - start.y);
    if (horizontalDistance <= 0 || verticalDistance > MAX_VERTICAL_DRIFT) {
      resetSwipe();
      return;
    }
    setIsSwiping(true);
    setSwipeOffset(Math.min(horizontalDistance, window.innerWidth * 0.85));
    event.preventDefault();
  }, [resetSwipe]);

  const handleTouchEnd = useCallback((event) => {
    const start = startRef.current;
    if (!start) return;
    const touch = event.changedTouches[0];
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = Math.abs(touch.clientY - start.y);
    resetSwipe();
    if (horizontalDistance >= TRIGGER_DISTANCE && verticalDistance <= MAX_VERTICAL_DRIFT) navigate(-1);
  }, [navigate, resetSwipe]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, swipeOffset, isSwiping };
}
