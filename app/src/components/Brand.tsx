export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="28"
      height="22"
      viewBox="0 0 28 22"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3.5 8.2 18.5 14 7.5 19.8 18.5 26 3.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="3.5" r="2.2" fill="var(--color-flare)" stroke="none" />
    </svg>
  );
}

export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`page-inner ${className}`}>{children}</div>;
}
