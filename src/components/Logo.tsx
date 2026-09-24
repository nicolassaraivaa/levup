export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <rect width="32" height="32" rx="8" fill="var(--brass)" />
      <path
        d="M12 23V9M8 13l4-4 4 4M12 23h11"
        stroke="var(--background)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({
  size = 28,
  textClassName = "text-lg",
  className = "",
}: {
  size?: number;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-semibold tracking-tight text-ink ${textClassName}`}>
        Lev<span className="text-brass">Up</span>
      </span>
    </span>
  );
}
