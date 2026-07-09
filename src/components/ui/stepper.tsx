"use client";

// Clamped −/value/+ number stepper.
export default function Stepper({
  value,
  onChange,
  min = 2,
  max = 20,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
      >
        -
      </button>
      <span className="w-6 text-center text-base font-semibold text-brand-text">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg border border-brand-border bg-brand-bg flex items-center justify-center text-brand-text flex-none"
      >
        +
      </button>
    </div>
  );
}
