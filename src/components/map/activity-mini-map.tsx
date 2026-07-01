"use client";

import { useRef, useState } from "react";
import Map, { Marker, type MapRef } from "react-map-gl";
import {
  MAP_STYLE,
  TOKEN,
  PIN_SIZE_SELECTED,
  PIN_COLOR,
} from "@/lib/utils/map-config";

type ActivityMiniMapProps = {
  lat: number;
  lng: number;
};

export default function ActivityMiniMap({ lat, lng }: ActivityMiniMapProps) {
  // Only mount the Marker once the map STYLE is truly loaded. `onLoad` (the
  // map `load` event) only guarantees the map object initialized, not that a
  // style/canvas is currently attached. On Turbopack HMR the map instance can
  // be reused with its style not yet re-added ("There is no style added to the
  // map."), so the Marker effect runs `marker.addTo(map)` against a map whose
  // canvas container is undefined and throws "Cannot read properties of
  // undefined (reading 'appendChild')". Gating on isStyleLoaded() — via both
  // `load` and the `styledata` event — closes that window.
  const mapRef = useRef<MapRef>(null);
  const [styleReady, setStyleReady] = useState(false);

  // `styledata` fires without a usable `target` in react-map-gl's types, so
  // read style readiness off the map ref instead of the event.
  const syncStyleReady = () => {
    if (mapRef.current?.isStyleLoaded()) setStyleReady(true);
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 14 }}
        dragPan={true}
        scrollZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        onLoad={syncStyleReady}
        onStyleData={syncStyleReady}
        style={{ width: "100%", height: "100%" }}
      >
        {styleReady && (
          <Marker
            longitude={Number(lng)}
            latitude={Number(lat)}
            anchor="center"
          >
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
          </Marker>
        )}
      </Map>
    </div>
  );
}
