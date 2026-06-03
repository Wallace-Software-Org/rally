"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  containerClassName?: string;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  const { overflow, overflowY } = window.getComputedStyle(node);
  if (/auto|scroll/.test(overflow + overflowY)) return node;
  return getScrollParent(node.parentElement);
}

export default function PageHeader({
  title,
  backHref,
  backLabel,
  containerClassName = "max-w-lg",
}: PageHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollParent = getScrollParent(ref.current?.parentElement ?? null);
    if (!scrollParent) return;

    function onScroll() {
      setScrolled(scrollParent!.scrollTop > 0);
    }

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scrollParent.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        borderBottom: "0.5px solid",
        borderColor: scrolled ? "rgba(0,0,0,0.2)" : "transparent",
        transition: "border-color 0.15s ease",
      }}
      className="bg-brand-bg sticky top-0 z-50 xl:static xl:z-auto xl:border-[transparent!important]"
    >
      <div
        className={`relative flex items-center justify-center xl:justify-start px-4 pt-6 pb-4 ${containerClassName} mx-auto w-full`}
      >
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="xl:hidden absolute left-4 flex items-center gap-1 text-brand-muted hover:text-brand-text transition-colors"
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-avatar-bg transition-colors">
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
            </span>
            {backLabel && (
              <span className="text-xs font-medium">{backLabel}</span>
            )}
          </Link>
        )}
        <h1 className="text-base font-semibold text-brand-text text-center xl:text-left">
          {title}
        </h1>
      </div>
    </div>
  );
}
