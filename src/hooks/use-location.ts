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
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "Geolocation not supported",
      }));
      return;
    }
    // No cleanup: getCurrentPosition has no cancellation API. If the component unmounts
    // before the callback fires, React 18 silently drops the setState call.
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        }),
      (err) => setState((s) => ({ ...s, loading: false, error: err.message })),
    );
  }, []);

  return state;
}
