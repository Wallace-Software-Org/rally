"use client";

import { useEffect, useState } from "react";

type LocationState = {
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
};

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    if (!navigator.geolocation) {
      queueMicrotask(() => {
        if (!active) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: "Geolocation not supported",
        }));
      });
      return () => {
        active = false;
      };
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active) return;
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        if (!active) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return state;
}
