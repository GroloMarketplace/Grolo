export default function MobileScreenLayout({ children, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      {children}
    </div>
  );
}
