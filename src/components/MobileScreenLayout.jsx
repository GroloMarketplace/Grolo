export default function MobileScreenLayout({ children, className = "" }) {
  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
