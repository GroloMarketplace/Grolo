import { useRef, useState } from "react";

export default function ImageGallery({ images, alt, className = "" }) {
  const scroller = useRef(null);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const photos = images?.length ? images : [];

  const handleScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToIndex = (i) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className={`flex flex-col gap-2 ${className}`}>
        <div
          ref={scroller}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-lg"
        >
          {photos.map((photo, i) => (
            <button
              key={photo}
              type="button"
              aria-label={`Expand image ${i + 1}`}
              onClick={() => setExpanded(true)}
              className="w-full shrink-0 snap-center"
            >
              <img
                src={photo}
                alt={`${alt} ${i + 1}`}
                className="w-full h-[327px] object-cover"
              />
            </button>
          ))}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={`rounded-full transition-all ${
                  i === index
                    ? "w-4 h-1.5 bg-[#498467]"
                    : "w-1.5 h-1.5 bg-[#D9D9D9]"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <FullScreenGallery
          photos={photos}
          alt={alt}
          startIndex={index}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}

function FullScreenGallery({ photos, alt, startIndex, onClose }) {
  const scroller = useRef(null);
  const [index, setIndex] = useState(startIndex);

  const setScroller = (el) => {
    if (el && scroller.current !== el) {
      scroller.current = el;
      el.scrollLeft = startIndex * el.clientWidth;
    }
  };

  const handleScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[375px]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white text-[16px] leading-none flex items-center justify-center"
        >
          ×
        </button>

        <div
          ref={setScroller}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {photos.map((photo, i) => (
            <div key={photo} className="w-full shrink-0 snap-center">
              <img
                src={photo}
                alt={`${alt} ${i + 1}`}
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          ))}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {photos.map((photo, i) => (
              <span
                key={photo}
                className={`rounded-full ${
                  i === index ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
