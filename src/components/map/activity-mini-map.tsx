"use client";

import Map from "react-map-gl";
import ActivityPin from "@/components/map/activity-pin";
import { MAP_STYLE, TOKEN } from "@/lib/utils/map-config";

type ActivityMiniMapProps = {
  lat: number;
  lng: number;
};

export default function ActivityMiniMap({ lat, lng }: ActivityMiniMapProps) {
  return (
    <Map
      mapboxAccessToken={TOKEN}
      mapStyle={MAP_STYLE}
      initialViewState={{ latitude: lat, longitude: lng, zoom: 14 }}
      dragPan={false}
      scrollZoom={false}
      doubleClickZoom={false}
      keyboard={false}
      style={{ width: "100%", height: "100%" }}
    >
      <ActivityPin lat={lat} lng={lng} isSelected={true} />
    </Map>
  );
}
