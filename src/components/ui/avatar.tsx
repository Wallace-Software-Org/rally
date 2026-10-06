import Image from "next/image";
import { getInitials } from "@/lib/utils/avatar";

// Circular avatar: photo when present, else initials. The caller sizes it via
// className (w/h, border, spacing) and initialsClassName (font size); dimension
// is the next/image pixel size. Pass blur to obscure the face/initials for
// signed-out viewers.
export default function Avatar({
  src,
  name,
  dimension,
  className = "",
  initialsClassName = "text-xs",
  blur = false,
}: {
  src: string | null;
  name: string | null | undefined;
  dimension: number;
  className?: string;
  initialsClassName?: string;
  blur?: boolean;
}) {
  const blurClass = blur ? " blur-sm" : "";
  // A blur filter paints past the element box, and the rounded-full +
  // overflow-hidden clip does not reliably contain a filtered child on its own
  // (Chrome/Safari) — the square corners of the blur show through. Promoting the
  // clip container to its own compositing layer with translateZ(0) makes the
  // circular clip apply to the blurred child.
  const clip = blur ? " [transform:translateZ(0)]" : "";
  return (
    <div
      className={`rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center${clip} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={dimension}
          height={dimension}
          className={`w-full h-full object-cover${blurClass}`}
        />
      ) : (
        <span
          className={`font-semibold text-brand-avatar-text ${initialsClassName}${blurClass}`}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
