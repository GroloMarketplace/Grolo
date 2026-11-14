import { useEffect, useRef, useState } from "react";
import startupAnimation from "../assets/Animation Grolo Splash Screen Updated.mp4";

export default function StartupSplash({ children }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    // Force the IDL properties, not just the markup attributes. iOS evaluates
    // autoplay eligibility against video.muted / video.playsInline, and React's
    // muted prop does not reliably set the property before first paint.
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");

    const playVideo = (source = "manual") => {
      if (video.paused === false || video.ended) return;
      const playback = video.play();
      if (playback) {
        playback.catch((error) => {
          console.error("[StartupSplash] autoplay failed", { source, error: error?.name ?? String(error) });
        });
      }
    };

    playVideo("mount");

    // Retry whenever the element becomes playable or is paused again.
    const retryEvents = ["canplay", "loadeddata", "loadedmetadata", "playing", "pause"];
    retryEvents.forEach((eventName) => video.addEventListener(eventName, playVideo));

    const timeout = window.setTimeout(() => setVisible(false), 12000);
    return () => {
      window.clearTimeout(timeout);
      retryEvents.forEach((eventName) => video.removeEventListener(eventName, playVideo));
    };
  }, []);

  return (
    <>
      {children}
      {visible && (
        <div className="startup-splash" role="status" aria-label="Loading Grolo">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            preload="auto"
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            onEnded={() => setVisible(false)}
            onError={() => setVisible(false)}
          >
            <source src={startupAnimation} type="video/mp4" />
          </video>
        </div>
      )}
    </>
  );
}
