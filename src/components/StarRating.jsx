export default function StarRating({ rating, size = 16, onChange, className = "" }) {
  const star = (filled) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={filled ? "text-[#FFC107]" : "text-[#E6E6E6]"}
    >
      <path
        d="M10 1.67 12.58 6.88l5.75.84-4.16 4.06.98 5.73L10 14.81l-5.15 2.71.98-5.73L1.67 7.73l5.75-.84L10 1.67Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= Math.round(rating);
        if (!onChange) return <span key={value}>{star(filled)}</span>;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
            onClick={() => onChange(value)}
            className="p-0.5"
          >
            {star(value <= rating)}
          </button>
        );
      })}
    </div>
  );
}
