"use client";

import { useEffect, useRef, useState } from "react";
import { SPORTS_LIST } from "@/lib/utils/sport-config";

export default function ActivityFilters({
  sport,
  onChange,
  wrap = false,
}: {
  sport: string;
  onChange: (s: string) => void;
  wrap?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [twoRowH, setTwoRowH] = useState<number | null>(null);
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrap) return;
    const el = pillsRef.current;
    if (!el) return;
    const firstPill = el.firstElementChild as HTMLElement | null;
    if (!firstPill) return;
    const pillH = firstPill.offsetHeight;
    const limit = pillH * 2 + 8; // 2 rows + gap-2
    setTwoRowH(limit);
    setOverflows(el.scrollHeight > limit + 2);
  }, [wrap]);

  const pills = SPORTS_LIST.map((s) => {
    const active = sport === s;
    return (
      <button
        key={s}
        onClick={() => onChange(s)}
        className={`flex-none rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
          active
            ? "border border-[#1D9E75] text-[#1D9E75] bg-[#C8E6DC]"
            : "border border-[#C8B8A8] text-[#7A6A5A] hover:border-[#B8A898]"
        }`}
      >
        {s}
      </button>
    );
  });

  if (!wrap) {
    return <>{pills}</>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={pillsRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        style={
          !expanded && overflows && twoRowH !== null
            ? { maxHeight: twoRowH }
            : undefined
        }
      >
        {pills}
      </div>
      {overflows && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="self-start text-xs font-medium text-[#7A6A5A] hover:text-[#2C2C2C] transition-colors"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
