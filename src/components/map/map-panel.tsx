"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Map, { type MapRef } from "react-map-gl";
import type { ActivityWithParticipants } from "@/types";
import ActivityPin from "@/components/map/activity-pin";
import { MAP_STYLE, TOKEN, MAP_LOADING_BG } from "@/lib/utils/map-config";
import { MAP_SPRING, MAP_FLY_MS } from "@/lib/brand";

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
  // Frame the view to the activities' pins on load (personal feed): fit bounds
  // with padding for 2+, center at a sensible zoom for 1, default view for 0.
  fitToPins?: boolean;
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
  fitToPins = false,
}: MapPanelProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevSelectedId = useRef<string | null>(null);
  const hasFitted = useRef(false);

  // Gate markers on the style being truly loaded, via both `load` and
  // `styledata`. `onLoad` alone can fire before the style/canvas is attached
  // (notably on Turbopack HMR), and mounting a Marker then throws an
  // appendChild error. `styledata` has no usable event target in react-map-gl's
  // types, so read readiness off the map ref.
  const syncStyleReady = () => {
    if (mapRef.current?.isStyleLoaded()) setMapLoaded(true);
  };

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
      if (
        typeof activity?.lat !== "number" ||
        typeof activity?.lng !== "number"
      )
        return;
      map.flyTo({
        center: [activity.lng, activity.lat],
        duration: MAP_FLY_MS,
        essential: true,
      });
    } else if (prev) {
      map.flyTo({
        center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
        duration: MAP_FLY_MS,
        essential: true,
      });
    }
  }, [selectedId, activities, variant]);

  const withCoords = activities.filter(
    (a) => typeof a.lat === "number" && typeof a.lng === "number",
  );

  // Frame the host's pins once the style is ready (personal feed). Runs once per
  // mount; selection fly-to takes over afterward.
  useEffect(() => {
    if (!fitToPins || !mapLoaded || hasFitted.current) return;
    const map = mapRef.current;
    if (!map) return;
    hasFitted.current = true;

    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.jumpTo({
        center: [withCoords[0].lng as number, withCoords[0].lat as number],
        zoom: 13,
      });
      return;
    }
    const lngs = withCoords.map((a) => a.lng as number);
    const lats = withCoords.map((a) => a.lat as number);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 56, maxZoom: 14, duration: 0 },
    );
  }, [fitToPins, mapLoaded, withCoords]);

  const stripInteractionOff =
    variant === "strip" ? { scrollZoom: false, doubleClickZoom: false } : {};

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
        transition={MAP_SPRING}
        className="w-full relative overflow-hidden"
        style={{ backgroundColor: MAP_LOADING_BG }}
      >
        <div style={{ height: "50vh", width: "100%" }}>
          <Map
            ref={mapRef}
            mapboxAccessToken={TOKEN}
            mapStyle={MAP_STYLE}
            initialViewState={DEFAULT_VIEW}
            onLoad={syncStyleReady}
            onStyleData={syncStyleReady}
            {...stripInteractionOff}
            style={{ width: "100%", height: "100%" }}
          >
            {pins}
          </Map>
        </div>
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="absolute z-10 flex items-center gap-1 rounded-full bg-brand-input/75 border-[0.5px] border-brand-border px-3 py-1 text-xs font-medium text-brand-text bottom-2 left-1/2 -translate-x-1/2 xl:bottom-auto xl:left-auto xl:translate-x-0 xl:top-2 xl:right-2"
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
          {expanded ? "" : "Expand"}
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
        onLoad={syncStyleReady}
        onStyleData={syncStyleReady}
        style={{ width: "100%", height: "100%" }}
      >
        {pins}
      </Map>
      {children}
    </div>
  );
}
