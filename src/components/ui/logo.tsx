// Three concentric circles, as fractions of the outer radius: outer 1.0, ring
// 0.77, centre 0.54. Mirrors logo-mark.svg, kept in the token system instead of
// a static asset so it scales and themes with the rest of the UI.
const RING_RATIO = 0.77;
const CENTER_RATIO = 0.54;

// Below this size the thin rings compress into mud, so render a plain dot.
export const LOGO_DOT_THRESHOLD_PX = 16;

export function Logo({
  size,
  className,
}: {
  size: number;
  className?: string;
}) {
  if (size < LOGO_DOT_THRESHOLD_PX) {
    return (
      <span
        aria-hidden="true"
        className={`block rounded-full bg-brand-teal ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const r = 50;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Rally"
      className={className}
    >
      <circle cx="50" cy="50" r={r} className="fill-brand-teal" />
      <circle cx="50" cy="50" r={r * RING_RATIO} className="fill-brand-input" />
      <circle cx="50" cy="50" r={r * CENTER_RATIO} className="fill-brand-teal" />
    </svg>
  );
}
