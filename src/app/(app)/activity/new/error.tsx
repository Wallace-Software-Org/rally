"use client";

import { useEffect } from "react";

// New activity form error boundary. No second action: this route is only
// reached from inside the app, so the nav is already there to leave by.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-3">
      <p className="text-base font-medium text-brand-text">
        Could not load this form
      </p>
      <p className="text-sm text-brand-muted">
        Something went wrong on our end.
      </p>
      <button onClick={reset} className="btn-tier-1 mt-1 px-6 cursor-pointer">
        Try again
      </button>
    </div>
  );
}
