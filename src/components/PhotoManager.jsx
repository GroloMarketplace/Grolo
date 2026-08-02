import { useRef } from "react";

const MAX_PHOTOS = 5;

export default function PhotoManager({ photos, onChange, label = "Photos" }) {
  const fileInput = useRef(null);
  const full = photos.length >= MAX_PHOTOS;

  const handleFiles = (event) => {
    const files = Array.from(event.target.files ?? []);
    const room = MAX_PHOTOS - photos.length;
    onChange([
      ...photos,
      ...files.slice(0, room).map((file) => URL.createObjectURL(file)),
    ]);
    event.target.value = "";
  };

  const move = (from, to) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const remove = (index) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const makeCover = (index) => move(index, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[14px] font-medium">{label}</label>
        <span className="text-[12px] text-[#828282]">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={full}
        className="w-full px-4 py-8 rounded-lg border-2 border-dashed border-[#E6E6E6] flex flex-col items-center justify-center gap-2 bg-[#F5F5F5] disabled:opacity-50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#828282" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[14px] text-[#828282]">
          {full ? `Photo limit reached (${MAX_PHOTOS})` : "Upload photos"}
        </span>
      </button>

      {photos.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          <p className="text-[12px] text-[#828282]">
            The first photo is the cover image.
          </p>
          {photos.map((photo, index) => (
            <div
              key={photo}
              className="flex items-center gap-3 rounded-lg border border-[#E6E6E6] p-2"
            >
              <div className="relative shrink-0">
                <img
                  src={photo}
                  alt={`Listing photo ${index + 1}`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 px-1.5 py-0.5 rounded-full bg-[#CFF7D3] text-[#02542D] text-[10px] font-medium">
                    Cover
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[12px] text-[#828282]">
                  Photo {index + 1}
                </span>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeCover(index)}
                    className="w-fit text-[12px] text-[#498467] font-medium"
                  >
                    Make cover
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  aria-label="Move photo up"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="w-8 h-8 rounded-lg border border-[#E6E6E6] flex items-center justify-center disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 10l4-4 4 4" stroke="#1E1E1E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Move photo down"
                  onClick={() => move(index, index + 1)}
                  disabled={index === photos.length - 1}
                  className="w-8 h-8 rounded-lg border border-[#E6E6E6] flex items-center justify-center disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="#1E1E1E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => remove(index)}
                  className="w-8 h-8 rounded-lg border border-[#E6E6E6] flex items-center justify-center"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="#1E1E1E" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
