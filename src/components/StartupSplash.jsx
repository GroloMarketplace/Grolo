import { useEffect, useState } from "react";
import splashAnimation from "../assets/splash-animation.webp";

// The splash plays a pre-rendered animated WebP instead of an HTML <video>.
// Animated images autoplay unconditionally on iOS WKWebView — no muted /
// playsInline requirements and no possibility of native media controls or a
// play-button overlay.
const SPLASH_DURATION_MS = 5100;

export default function StartupSplash({ children }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div className="startup-splash" role="status" aria-label="Loading Grolo">
          <img src={splashAnimation} alt="" />
        </div>
      )}
    </>
  );
}
