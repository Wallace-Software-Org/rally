export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad Pro reports MacIntel but has touch points
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
