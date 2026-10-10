import { useEffect, useRef, useState } from "react";
import startupAnimation from "../assets/Animation-Grolo-Splash-Screen.mp4";

export default function StartupSplash({ children }) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    // Set the media properties before asking WebKit to start playback. This is
    // more reliable on a cold launch than relying on the autoplay attribute
    // alone, especially when the video has an audio track.
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;

    const playVideo = () => {
      const playback = video.play();
      if (playback) playback.catch(() => {});
    };

    playVideo();
    video.addEventListener("canplay", playVideo);
    video.addEventListener("loadeddata", playVideo);

    const timeout = window.setTimeout(() => setVisible(false), 12000);
    return () => {
      window.clearTimeout(timeout);
      video.removeEventListener("canplay", playVideo);
      video.removeEventListener("loadeddata", playVideo);
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
            defaultMuted
            muted
            playsInline
            preload="auto"
            onEnded={() => setVisible(false)}
            onError={() => setVisible(false)}
            src={startupAnimation}
          />
        </div>
      )}
    </>
  );
}
