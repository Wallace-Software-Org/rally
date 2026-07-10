import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLocation } from "@/hooks/use-location";

type SuccessCallback = (pos: {
  coords: { latitude: number; longitude: number };
}) => void;
type ErrorCallback = (err: { message: string }) => void;

// JSDOM has no real geolocation, so tests drive these fakes.
const mockGeolocation = {
  getCurrentPosition:
    vi.fn<(success: SuccessCallback, error: ErrorCallback) => void>(),
};

function setPermission(state: PermissionState | null) {
  if (state === null) {
    // Simulate a browser without the Permissions API.
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: undefined,
    });
    return;
  }
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: vi.fn(async () => ({ state })) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: mockGeolocation,
  });
  setPermission(null);
});

describe("useLocation", () => {
  it("does not request geolocation on mount", () => {
    renderHook(() => useLocation());
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("starts idle with no coords, using any initial coords passed in", () => {
    const { result } = renderHook(() =>
      useLocation({ lat: 10, lng: 20 }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.coords).toEqual({ lat: 10, lng: 20 });
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("resolves coords and status on request() success", async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 33.4484, longitude: -112.074 } });
    });
    const { result } = renderHook(() => useLocation());
    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe("granted"));
    expect(result.current.coords).toEqual({ lat: 33.4484, lng: -112.074 });
  });

  it("sets denied status on request() error", async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error({ message: "User denied geolocation" });
    });
    const { result } = renderHook(() => useLocation());
    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(result.current.coords).toBeNull();
  });

  it("detects an already-denied permission on mount without requesting", async () => {
    setPermission("denied");
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(mockGeolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("reports unsupported once request() runs without a geolocation API", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useLocation());
    // No synchronous request on mount, so it starts idle.
    expect(result.current.status).toBe("idle");
    act(() => result.current.request());
    expect(result.current.status).toBe("unsupported");
  });
});
