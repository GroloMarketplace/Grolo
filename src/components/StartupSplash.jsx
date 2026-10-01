import { useEffect, useState } from "react";
import startupAnimation from "../assets/Animation-Grolo-Splash-Screen.mp4";

export default function StartupSplash({ children }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div className="startup-splash" role="status" aria-label="Loading Grolo">
          <video autoPlay muted playsInline onEnded={() => setVisible(false)} onError={() => setVisible(false)} src={startupAnimation} />
        </div>
      )}
    </>
  );
}
