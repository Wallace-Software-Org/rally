// Shared skeleton block. The caller supplies the box (width, height, radius,
// borders) so the placeholder occupies exactly what the real element will, and
// nothing shifts when content lands. Fill and pulse come from the skeleton-block
// utility; `delayIndex` staggers siblings by 0.15s each so a group does not
// pulse in unison.
export default function Skeleton({
  className = "",
  delayIndex = 0,
}: {
  className?: string;
  delayIndex?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-block ${className}`}
      style={
        delayIndex > 0
          ? { animationDelay: `${delayIndex * 0.15}s` }
          : undefined
      }
    />
  );
}
