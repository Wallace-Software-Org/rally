"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether the viewer has accepted the participant waiver, as the client knows it.
// The server page passes what it saw at render time; that goes stale the moment
// the user signs in this session (every other join surface on the page would
// still show the first-time modal) or a version bump lands mid-session. So the
// client keeps a small shared override, applied over the server value:
//   null  = no news since page load, follow the server value
//   true  = accepted here (or refreshed) this session
//   false = the server just answered waiverRequired, so the server value is stale
// It is module-level so every join surface on the page reads the same answer.
// It is only ever written from event handlers, never during render, and the
// server snapshot is always null, so nothing is shared across SSR requests.
let override: boolean | null = null;
const listeners = new Set<() => void>();

function setOverride(value: boolean | null) {
  if (override === value) return;
  override = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => override;
const getServerSnapshot = () => null;

export function useParticipantWaiver(serverAccepted: boolean) {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const markAccepted = useCallback(() => setOverride(true), []);
  const markRequired = useCallback(() => setOverride(false), []);

  return {
    accepted: current ?? serverAccepted,
    markAccepted,
    markRequired,
  };
}

// Test hook: the override outlives a component, so specs reset it between runs.
export function resetParticipantWaiverOverride() {
  setOverride(null);
}
