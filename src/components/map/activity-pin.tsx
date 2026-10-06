"use client";

import { Marker } from "react-map-gl";
import {
  PIN_SIZE_DEFAULT,
  PIN_SIZE_SELECTED,
  PIN_SIZE_GROUP,
  PIN_SIZE_GROUP_SELECTED,
  PIN_COLOR,
} from "@/lib/utils/map-config";

type ActivityPinProps = {
  lat: number;
  lng: number;
  isSelected: boolean;
  onClick?: () => void;
  label?: string | null;
  // Activities sharing these coordinates. Above 1 the pin grows and carries the
  // count, but the fill states are the same either way.
  count?: number;
};

export default function ActivityPin({
  lat,
  lng,
  isSelected,
  onClick,
  label,
  count = 1,
}: ActivityPinProps) {
  const isGroup = count > 1;
  const size = isGroup
    ? isSelected
      ? PIN_SIZE_GROUP_SELECTED
      : PIN_SIZE_GROUP
    : isSelected
      ? PIN_SIZE_SELECTED
      : PIN_SIZE_DEFAULT;

  return (
    <Marker longitude={Number(lng)} latitude={Number(lat)} anchor="center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        // The count alone ("4") reads as nothing useful out of context.
        aria-label={
          isGroup
            ? `${count} activities at ${label ?? "this location"}`
            : undefined
        }
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: onClick ? "pointer" : "default",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {isSelected && label && (
          <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-brand-border rounded-lg px-2 py-0.5 text-xs text-brand-text pointer-events-none">
            {label}
          </span>
        )}
        <div
          className="flex items-center justify-center text-[11px] font-semibold leading-none"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            flexShrink: 0,
            boxSizing: "border-box",
            backgroundColor: isSelected ? PIN_COLOR : "var(--color-brand-bg)",
            border: isSelected ? "none" : `2px solid ${PIN_COLOR}`,
            color: isSelected ? "var(--color-brand-warm-muted)" : PIN_COLOR,
            ...(isSelected && {
              boxShadow: `0 0 0 2px white, 0 0 0 4px ${PIN_COLOR}`,
            }),
          }}
        >
          {isGroup ? count : null}
        </div>
      </button>
    </Marker>
  );
}
