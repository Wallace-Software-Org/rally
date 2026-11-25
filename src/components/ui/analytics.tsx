"use client";

// Vercel Web Analytics, page views only. "use client" is required: beforeSend
// is a function, and a server component cannot pass one across the RSC
// boundary, so the root layout renders this wrapper instead of <Analytics />
// directly.
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Strip the query string from every tracked URL, keeping the path. Rally puts
// real data in query params (?join=true and ?next= on the OAuth return,
// ?activities= and ?view= on the feed, the prefilled ?title=/?lat=/?lng= the
// repeat flow carries), and none of it belongs in analytics. Returning the
// event with a path-only url keeps the page view; returning null would drop it.
export function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    // Spread keeps the event's discriminant (pageview vs event) intact.
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    // Not a parseable absolute URL. Drop it rather than forward something
    // unparsed that might still carry a query string.
    return null;
  }
}

export default function AnalyticsBeacon() {
  return <Analytics beforeSend={beforeSend} />;
}
