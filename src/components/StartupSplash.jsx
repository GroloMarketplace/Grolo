import { useEffect, useState } from "react";
import logo from "../assets/grolo-new-logo.svg";

export default function StartupSplash({ children }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div className="startup-splash" role="status" aria-label="Loading Grolo">
          <img src={logo} alt="Grolo" />
        </div>
      )}
    </>
  );
}
