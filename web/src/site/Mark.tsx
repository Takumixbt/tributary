/**
 * The Tributary mark: two streams of income joining one channel. Drawn in
 * currentColor so it works on either surface.
 */
export function Mark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 5 C7 14, 16 14, 16 20" />
        <path d="M25 5 C25 14, 16 14, 16 20" />
        <path d="M16 20 L16 28" />
      </g>
    </svg>
  );
}
