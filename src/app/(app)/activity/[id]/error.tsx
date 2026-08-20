"use client";

import { useEffect } from "react";
import Link from "next/link";

// Activity detail error boundary. A missing or deleted activity is a 404 from
// notFound(), so this only catches real failures. The second action matters
// here: someone arriving from a shared link has no history to go back to.
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
        Could not load this activity
      </p>
      <p className="text-sm text-brand-muted">
        Something went wrong on our end.
      </p>
      <button onClick={reset} className="btn-tier-1 mt-1 px-6 cursor-pointer">
        Try again
      </button>
      <Link href="/" className="link-action text-sm">
        Back to activities
      </Link>
    </div>
  );
}
