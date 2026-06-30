/**
 * Resolves the canonical site origin for building absolute URLs (activity links,
 * share URLs, etc). Always returns a value with no trailing slash so callers can
 * append paths directly.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL  (explicit override)
 *   2. VERCEL_URL            (preview/production deploys, prefixed with https://)
 *   3. window.location.origin (browser)
 *   4. http://localhost:3000 (fallback)
 *
 * Note: auth OAuth redirects intentionally use window.location.origin directly
 * and must not use this resolver.
 */
export function getSiteUrl(): string {
  const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (process.env.VERCEL_URL) {
    return stripTrailingSlash(`https://${process.env.VERCEL_URL}`);
  }

  if (typeof window !== "undefined") {
    return stripTrailingSlash(window.location.origin);
  }

  return "http://localhost:3000";
}
