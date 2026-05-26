"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Map, { type MapRef } from "react-map-gl";
import type { ActivityWithParticipants } from "@/types";
import ActivityPin from "@/components/map/activity-pin";
import { MAP_STYLE, TOKEN } from "@/lib/utils/map-config";

const DEFAULT_VIEW = {
  longitude: -111.9261,
  latitude: 33.4942,
  zoom: 11,
} as const;

type MapPanelProps = {
  activities: ActivityWithParticipants[];
  userId?: string | null;
  variant?: "strip" | "full";
  selectedId?: string | null;
  onDotClick?: (id: string) => void;
  children?: React.ReactNode;
  userLat?: number | null;
  userLng?: number | null;
};

export default function MapPanel({
  activities,
  userId: _userId,
  variant = "full",
  selectedId,
  onDotClick,
  children,
  userLat: _userLat,
  userLng: _userLng,
}: MapPanelProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMobile] = useState(() => window.innerWidth < 768);
  const [expanded, setExpanded] = useState(false);
  const prevSelectedId = useRef<string | null>(null);

  // Fly to selected activity at zoom 14; fly back to default view on deselect
  useEffect(() => {
    if (variant !== "full") return;
    if (selectedId === prevSelectedId.current) return;

    const prev = prevSelectedId.current;
    prevSelectedId.current = selectedId ?? null;

    const map = mapRef.current;
    if (!map) return;

    if (selectedId) {
      const activity = activities.find((a) => a.id === selectedId);
      if (typeof activity?.lat !== "number" || typeof activity?.lng !== "number") return;
      map.flyTo({ center: [activity.lng, activity.lat], duration: 600, essential: true });
    } else if (prev) {
      map.flyTo({
        center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
        duration: 600,
        essential: true,
      });
    }
  }, [selectedId, activities, variant]);

  const stripInteractionOff =
    variant === "strip" && isMobile
      ? { dragPan: false, scrollZoom: false, doubleClickZoom: false }
      : {};

  const withCoords = activities.filter(
    (a) => typeof a.lat === "number" && typeof a.lng === "number",
  );
  console.log(
    "Activities with coords:",
    withCoords.length,
    withCoords.map((a) => ({ title: a.title, lat: a.lat, lng: a.lng })),
  );

  const pins = mapLoaded
    ? withCoords.map((a) => (
        <ActivityPin
          key={a.id}
          lat={a.lat as number}
          lng={a.lng as number}
          isSelected={selectedId === a.id}
          onClick={() => onDotClick?.(a.id)}
          label={a.location_name}
        />
      ))
    : null;

  if (variant === "strip") {
    return (
      <motion.div
        initial={{ height: "10rem" }}
        animate={{ height: expanded ? "50vh" : "10rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onAnimationComplete={() => mapRef.current?.resize()}
        className="w-full relative overflow-hidden bg-[#0d1b2a]"
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          mapStyle={MAP_STYLE}
          initialViewState={DEFAULT_VIEW}
          onLoad={() => setMapLoaded(true)}
          {...stripInteractionOff}
          style={{ width: "100%", height: "100%" }}
        >
          {pins}
        </Map>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/90 border border-brand-border px-3 py-1 text-xs font-medium text-brand-text"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            {expanded ? (
              <path
                d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M1.5 5H8.5M5 1.5V8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}
          </svg>
          {expanded ? "Collapse map" : "Expand map"}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={DEFAULT_VIEW}
        onLoad={() => setMapLoaded(true)}
        style={{ width: "100%", height: "100%" }}
      >
        {pins}
      </Map>
      {children}
    </div>
  );
}
