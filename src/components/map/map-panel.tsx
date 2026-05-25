"use client";

import { useRef, useEffect, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl";
import type { ActivityWithParticipants } from "@/types";
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
      map.flyTo({ center: [activity.lng, activity.lat], zoom: 14, duration: 800 });
    } else if (prev) {
      map.flyTo({
        center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
        zoom: DEFAULT_VIEW.zoom,
        duration: 800,
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
        <Marker
          key={a.id}
          longitude={a.lng as number}
          latitude={a.lat as number}
        >
          <div
            onClick={() => onDotClick?.(a.id)}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#1D9E75",
              border: "2px solid white",
              cursor: "pointer",
            }}
          />
        </Marker>
      ))
    : null;

  if (variant === "strip") {
    return (
      <div className="w-full h-40 md:h-48 relative overflow-hidden">
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
        <button className="absolute bottom-2 left-3 z-10 flex items-center gap-1 rounded-full bg-brand-bg border border-brand-border px-3 py-1 text-xs font-medium text-brand-muted shadow-sm">
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
