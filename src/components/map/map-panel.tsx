"use client";

import { useMemo } from "react";
import type { ActivityWithParticipants } from "@/types";

type DotPosition = { x: number; y: number };

function useDotPositions(
  activities: ActivityWithParticipants[],
): Map<string, DotPosition> {
  return useMemo(() => {
    const PAD = 15;
    const withCoords = activities.filter((a) => a.lat != null && a.lng != null);
    if (withCoords.length === 0) return new Map();

    const lats = withCoords.map((a) => a.lat!);
    const lngs = withCoords.map((a) => a.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1; // || 1 prevents division by zero when all activities share the same coordinates
    const lngRange = maxLng - minLng || 1;
    const scale = 100 - PAD * 2;

    const map = new Map<string, DotPosition>();
    for (const a of withCoords) {
      map.set(a.id, {
        x: PAD + ((a.lng! - minLng) / lngRange) * scale,
        // invert lat: higher lat = further up = lower y%
        y: PAD + ((maxLat - a.lat!) / latRange) * scale,
      });
    }

    // Nudge dots that are too close together so labels don't overlap
    const COLLISION_RADIUS = 6;
    const posArray = Array.from(map.values());
    for (let pass = 0; pass < 10; pass++) {
      for (let i = 0; i < posArray.length; i++) {
        for (let j = i + 1; j < posArray.length; j++) {
          const a = posArray[i];
          const b = posArray[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) {
            a.y -= COLLISION_RADIUS / 2;
            b.y += COLLISION_RADIUS / 2;
          } else if (dist < COLLISION_RADIUS) {
            const push = (COLLISION_RADIUS - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            a.x += nx * push;
            a.y += ny * push;
            b.x -= nx * push;
            b.y -= ny * push;
          }
        }
      }
    }

    return map;
  }, [activities]);
}

type MapPanelProps = {
  activities: ActivityWithParticipants[];
  userId?: string | null;
  variant?: "strip" | "full";
  selectedId?: string | null;
  onDotClick?: (id: string) => void;
  children?: React.ReactNode;
};

export default function MapPanel({
  activities,
  userId,
  variant = "full",
  selectedId,
  onDotClick,
  children,
}: MapPanelProps) {
  const dotPositions = useDotPositions(activities);

  if (variant === "strip") {
    return (
      <div className="h-20 bg-[#E8DFCF] relative overflow-hidden flex items-end px-3 pb-2">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,120,100,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,120,100,0.2) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {activities.map((a) => {
          const pos = dotPositions.get(a.id);
          if (!pos) return null;
          return (
            <span
              key={a.id}
              className="absolute w-2 h-2 rounded-full bg-[#1D9E75]"
              style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
            />
          );
        })}
        <button className="relative z-10 flex items-center gap-1 rounded-full bg-[#F0EAE2] border border-[#C8B8A8] px-3 py-1 text-[11px] font-medium text-[#7A6A5A] shadow-sm">
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1.5 5H8.5M5 1.5V8.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Expand map
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-[#E8DFCF] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,120,100,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139,120,100,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {activities.map((a) => {
        const pos = dotPositions.get(a.id);
        if (!pos) return null;
        const isActive = selectedId === a.id;
        return (
          <button
            key={a.id}
            onClick={() => onDotClick?.(a.id)}
            className="absolute -translate-x-1/2 flex flex-col items-center gap-0.5 group"
            style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
          >
            {userId && (
              <span className="text-[10px] font-medium text-[#7A6A5A] bg-[#F0EAE2]/80 px-1.5 py-0.5 rounded backdrop-blur-sm leading-tight max-w-25 truncate">
                {a.location_name}
              </span>
            )}
            <span
              className="rounded-full transition-all"
              style={
                isActive
                  ? {
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "#1D9E75",
                      outline: "2px solid white",
                      outlineOffset: "1px",
                      boxShadow: "0 0 0 1px #1D9E75",
                    }
                  : {
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#1D9E75",
                    }
              }
            />
          </button>
        );
      })}
      {children}
    </div>
  );
}
