"use client";

import { Marker } from "react-map-gl";
import {
  PIN_SIZE_DEFAULT,
  PIN_SIZE_SELECTED,
  PIN_SIZE_OTHER,
  PIN_COLOR,
  PIN_COLOR_MUTED,
} from "@/lib/utils/map-config";

// Calendar view tone, keyed off whether the pin's day is the selected one.
// Overrides the list-view isSelected styling.
export type PinTone = "calendar-selected" | "calendar-other";

type ActivityPinProps = {
  lat: number;
  lng: number;
  isSelected: boolean;
  onClick?: () => void;
  label?: string | null;
  tone?: PinTone;
};

const BG = "var(--color-brand-bg)";

// List view: hollow teal dot, solid + ringed + labeled when selected.
// Calendar view: selected day solid teal at default size; other days a smaller
// hollow desaturated-teal dot that recedes into the background.
function appearanceFor(isSelected: boolean, tone?: PinTone) {
  if (tone === "calendar-selected") {
    return { size: PIN_SIZE_DEFAULT, fill: PIN_COLOR, border: "none", ring: false, showLabel: false };
  }
  if (tone === "calendar-other") {
    return {
      size: PIN_SIZE_OTHER,
      fill: BG,
      border: `2px solid ${PIN_COLOR_MUTED}`,
      ring: false,
      showLabel: false,
    };
  }
  if (isSelected) {
    return { size: PIN_SIZE_SELECTED, fill: PIN_COLOR, border: "none", ring: true, showLabel: true };
  }
  return { size: PIN_SIZE_DEFAULT, fill: BG, border: `2px solid ${PIN_COLOR}`, ring: false, showLabel: false };
}

export default function ActivityPin({
  lat,
  lng,
  isSelected,
  onClick,
  label,
  tone,
}: ActivityPinProps) {
  const { size, fill, border, ring, showLabel } = appearanceFor(isSelected, tone);

  return (
    <Marker longitude={Number(lng)} latitude={Number(lat)} anchor="center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
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
        {showLabel && label && (
          <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-brand-border rounded-lg px-2 py-0.5 text-xs text-brand-text pointer-events-none">
            {label}
          </span>
        )}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            flexShrink: 0,
            boxSizing: "border-box",
            backgroundColor: fill,
            border,
            ...(ring && {
              boxShadow: `0 0 0 2px white, 0 0 0 4px ${PIN_COLOR}`,
            }),
          }}
        />
      </button>
    </Marker>
  );
}
