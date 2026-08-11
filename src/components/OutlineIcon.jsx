const ICON_PATHS = {
  eye: "M2.5 12s3.2-5 9.5-5 9.5 5 9.5 5-3.2 5-9.5 5-9.5-5-9.5-5Zm9.5 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  heart: "M20.8 8.7c0 5-8.8 10.3-8.8 10.3S3.2 13.7 3.2 8.7A4.2 4.2 0 0 1 11 5.9a4.2 4.2 0 0 1 7.8 2.8Z",
  message: "M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 2.5 1-4.3A7.5 7.5 0 1 1 20 11.5Z",
  users: "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20m7-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm5-6.5a3 3 0 0 1 0 5.8M18 14.5a4 4 0 0 1 4 4V20",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0 9 4.5 9-4.5M12 12v9",
  sales: "M4 19V9m6 10V5m6 14v-7m6 7V3",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  sprout: "M12 21V11m0 0C8 11 5 8.5 5 4c4.5 0 7 2.5 7 7Zm0 2c0-5 3-8 8-8 0 4.5-3 8-8 8Z",
  leaf: "M20 4C11 4 5 8 5 14c0 3.3 2.2 6 5.5 6C16 20 20 13 20 4ZM5 20c2-4 5-6.5 10-8.5",
  tree: "M12 21V14m-4 7h8M12 3 8.5 8H10l-3 4h3l-2 4h8l-2-4h3l-3-4h1.5L12 3Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-8.5-9h17M12 3c2 2.3 3 5.3 3 9s-1 6.7-3 9c-2-2.3-3-5.3-3-9s1-6.7 3-9Z",
  home: "m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Zm6 11v-6h6v6",
  // Grolo's signature location marker: the classic pin silhouette with a
  // small leaf accent inside instead of a plain hole, used consistently for
  // both stored locations (grey) and distance labels (green) app-wide.
  location: "M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Zm-2.6-10.4c1-1.9 2.7-2.8 4.8-2.6-.2 2-1.5 3.3-3.6 3.6",
  trash: "M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-9 0 1 13h10l1-13",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 8v-1a6 6 0 0 1 12 0v1",
  cancel: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9l6 6M15 9l-6 6",
};

export default function OutlineIcon({ name, size = 18, className = "", label, fill = "none" }) {
  const path = ICON_PATHS[name] ?? ICON_PATHS.sprout;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
    >
      <path d={path} fill={fill} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
