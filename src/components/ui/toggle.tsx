"use client";

// Pill switch used in forms. Presentation only — caller owns the label row.
export default function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`w-10 h-6 rounded-full p-0.5 flex items-center transition-colors duration-200 flex-none ${
        checked ? "bg-brand-teal justify-end" : "bg-brand-border justify-start"
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}
