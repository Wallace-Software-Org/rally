"use client";

import { useCallback, useEffect, useState } from "react";

export type GeoStatus = "idle" | "granted" | "denied" | "unsupported";
export type Coords = { lat: number; lng: number };

// On-demand geolocation. It never requests position automatically; the caller
// wires request() to an explicit user action (the in-panel "Enable location"
// button). On mount it only queries the Permissions API to surface an
// already-denied state, so callers can show blocked copy instead of a button
// that would silently fail. Available to signed-out users too; persisting the
// coords is the caller's (auth-gated) concern.
export function useLocation(initialCoords: Coords | null = null) {
  const [coords, setCoords] = useState<Coords | null>(initialCoords);
  const [status, setStatus] = useState<GeoStatus>("idle");

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.geolocation || !navigator.permissions?.query) return;

    let active = true;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((res) => {
        if (active && res.state === "denied") setStatus("denied");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
    );
  }, []);

  return { coords, status, request };
}
