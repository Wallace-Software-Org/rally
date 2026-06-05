"use client";

import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  defaultOpenValue?: string;
}

type Slot = { value: string; label: string };

function buildSlots(): Slot[] {
  const slots: Slot[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      slots.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` });
    }
  }
  return slots;
}

const SLOTS = buildSlots();

function formatDisplay(value: string): string {
  if (!value) return "";
  const slot = SLOTS.find((s) => s.value === value);
  if (slot) return slot.label;
  const [h, m] = value.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select a time",
  defaultOpenValue = "00:00",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const scrollValue = value || defaultOpenValue;
    const idx = Math.max(0, SLOTS.findIndex((s) => s.value >= scrollValue));
    const el = listRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "center" });
  }, [defaultOpenValue, open, value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full rounded-xl border border-brand-border bg-transparent px-4 py-3 text-sm text-left focus:outline-none focus:ring-[1.5px] focus:ring-brand-teal ${value ? "text-brand-text" : "text-brand-muted"}`}
      >
        {value ? formatDisplay(value) : placeholder}
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 mt-1 w-full max-h-56 overflow-y-auto bg-brand-bg border border-brand-border rounded-xl shadow-md z-50 py-1"
        >
          {SLOTS.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => {
                onChange(slot.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${
                slot.value === value
                  ? "bg-brand-teal text-white font-medium"
                  : "text-brand-text hover:bg-brand-avatar-bg"
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
