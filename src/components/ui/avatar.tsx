import Image from "next/image";
import { getInitials } from "@/lib/utils/avatar";

// Circular avatar: photo when present, else initials. The caller sizes it via
// className (w/h, border, spacing) and initialsClassName (font size); dimension
// is the next/image pixel size.
export default function Avatar({
  src,
  name,
  dimension,
  className = "",
  initialsClassName = "text-xs",
}: {
  src: string | null;
  name: string | null | undefined;
  dimension: number;
  className?: string;
  initialsClassName?: string;
}) {
  return (
    <div
      className={`rounded-full overflow-hidden bg-brand-avatar-bg flex items-center justify-center ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={dimension}
          height={dimension}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className={`font-semibold text-brand-avatar-text ${initialsClassName}`}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
