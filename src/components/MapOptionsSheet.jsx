const MAP_OPTIONS = [
  {
    label: "Apple Maps",
    getUrl: (address) => `https://maps.apple.com/?address=${encodeURIComponent(address)}`,
  },
  {
    label: "Google Maps",
    getUrl: (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  },
  {
    label: "Waze",
    getUrl: (address) => `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
  },
];

export default function MapOptionsSheet({ address, onClose }) {
  const openMap = (getUrl) => {
    window.open(getUrl(address), "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/30">
      <button type="button" aria-label="Close maps menu" onClick={onClose} className="absolute inset-0 h-full w-full" />
      <div className="relative w-full rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D9D9D9]" />
        <h2 className="text-[18px] font-semibold">Open in Maps</h2>
        <div className="mt-3 flex flex-col">
          {MAP_OPTIONS.map((option) => (
            <button key={option.label} type="button" onClick={() => openMap(option.getUrl)} className="border-b border-[#E6E6E6] py-3 text-left text-[15px] text-[#498467]">
              📍 {option.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full rounded-lg bg-[#F5F5F5] py-3 text-[15px] font-medium">Cancel</button>
      </div>
    </div>
  );
}
