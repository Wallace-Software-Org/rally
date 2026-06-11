"use client";

import { useState, useRef, useEffect } from "react";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  listClassName?: string;
}

export default function Select({ value, onChange, options, placeholder, listClassName }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-xl border bg-transparent px-4 py-3 text-sm text-brand-text text-left flex items-center justify-between focus:outline-none transition-colors ${
          open
            ? "border-brand-teal ring-[1.5px] ring-brand-teal"
            : "border-brand-border"
        }`}
      >
        <span className={!value && placeholder ? "text-brand-muted" : ""}>
          {value || placeholder || ""}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`flex-none text-brand-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-brand-bg border border-brand-border rounded-xl shadow-md z-50 overflow-hidden">
          <div className={listClassName ?? ""}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false); }}
                className={`w-full px-4 py-3 text-sm text-left transition-colors hover:bg-brand-avatar-bg ${
                  option === value
                    ? "text-brand-teal font-medium"
                    : "text-brand-text"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
