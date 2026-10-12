import type { ReactNode } from "react";

// Shared shape for every "nothing here" screen: feed (no activities, filters
// match nothing) and profile tabs (empty Hosting/Attending). Mirrors the
// error boundary layout (src/app/(app)/error.tsx and siblings) so the two
// read as the same family: centered, generous padding, heading in brand
// text, body in brand muted, one optional action below.
export function EmptyState({
  heading,
  body,
  action,
}: {
  heading: string;
  // Optional: a few call sites (profile tabs) are a single short statement
  // with no elaborating line.
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
      <p className="text-base font-medium text-brand-text">{heading}</p>
      {body && <p className="text-sm text-brand-muted">{body}</p>}
      {action}
    </div>
  );
}
