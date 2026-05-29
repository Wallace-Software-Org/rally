"use client";

import Map from "react-map-gl";
import { MAP_STYLE, TOKEN, PIN_SIZE_SELECTED, PIN_COLOR } from "@/lib/utils/map-config";

type ActivityMiniMapProps = {
  lat: number;
  lng: number;
};

export default function ActivityMiniMap({ lat, lng }: ActivityMiniMapProps) {
  return (
    <div className="relative w-full h-full">
      <Map
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 14 }}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        style={{ width: "100%", height: "100%" }}
      />
      {/* CSS-positioned pin — avoids Mapbox Marker DOM API and Fast Refresh race */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{
            width: PIN_SIZE_SELECTED,
            height: PIN_SIZE_SELECTED,
            borderRadius: "50%",
            backgroundColor: PIN_COLOR,
            boxShadow: `0 0 0 2px white, 0 0 0 4px ${PIN_COLOR}`,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}
