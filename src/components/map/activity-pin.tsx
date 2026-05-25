"use client";

import { Marker } from "react-map-gl";
import { PIN_SIZE_DEFAULT, PIN_SIZE_SELECTED, PIN_COLOR } from "@/lib/utils/map-config";

type ActivityPinProps = {
  lat: number;
  lng: number;
  isSelected: boolean;
  onClick?: () => void;
  label?: string | null;
};

export default function ActivityPin({ lat, lng, isSelected, onClick, label }: ActivityPinProps) {
  const size = isSelected ? PIN_SIZE_SELECTED : PIN_SIZE_DEFAULT;

  return (
    <Marker longitude={Number(lng)} latitude={Number(lat)} anchor="center">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        style={{ background: "none", border: "none", padding: 0, cursor: onClick ? "pointer" : "default" }}
        className="relative flex items-center justify-center"
      >
        {isSelected && label && (
          <span className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-brand-border rounded-lg px-2 py-0.5 text-xs text-brand-text">
            {label}
          </span>
        )}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: PIN_COLOR,
            flexShrink: 0,
            ...(isSelected && {
              outline: "2px solid white",
              outlineOffset: "1px",
              boxShadow: `0 0 0 1px ${PIN_COLOR}`,
            }),
          }}
        />
      </button>
    </Marker>
  );
}
