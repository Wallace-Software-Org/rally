"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  /** When provided, navigates here. Otherwise falls back to router.back(). */
  href?: string;
}

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="Back"
      className="xl:hidden fixed top-18 md:top-20 left-3 md:left-6 z-50 w-8.5 h-8.5 rounded-full bg-brand-surface shadow-sm flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M11 14L6 9l5-5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
