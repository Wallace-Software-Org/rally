"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { WaiverDefinition } from "@/lib/waivers";
import {
  normalizeInitials,
  WAIVER_INITIALS_MAX,
} from "@/lib/utils/waiver-validation";
import WaiverText from "@/components/activities/waiver-text";

// A few pixels of slack so rounding in scrollHeight/clientHeight (subpixel
// layout, zoom) doesn't leave the box permanently one pixel short of "bottom".
const SCROLL_BOTTOM_TOLERANCE_PX = 4;

// The body of a first-time waiver modal: scrollable full text, an unchecked
// agreement box, initials, the confirm button, and a quiet Cancel. Shared by the
// join modal and the host modal so the two cannot drift; each supplies its own
// heading and shell. `onConfirm` resolves to an error message to show inline, or
// null on success (the caller then closes).
//
// The checkbox and initials field stay disabled until the waiver text has been
// scrolled to the bottom, so agreeing requires having seen the whole thing. If
// the text is short enough that the box never overflows, that is already true
// at scrollTop 0, so the same read enables it immediately on mount. Once read,
// it stays read: the gate never re-locks on scrolling back up.
export default function WaiverAgreement({
  waiver,
  confirmLabel,
  busyLabel,
  onConfirm,
  onCancel,
}: {
  waiver: WaiverDefinition;
  confirmLabel: string;
  busyLabel: string;
  onConfirm: (initials: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const initialsId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [hasReadToBottom, setHasReadToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [initials, setInitials] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-way: only ever flips false -> true. Called on scroll, on mount (where
  // scrollTop is 0, so non-overflowing text reads as already "at the bottom"),
  // and on resize (a rotation or window resize can remove the overflow).
  const checkScrolledToBottom = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= SCROLL_BOTTOM_TOLERANCE_PX) {
      setHasReadToBottom(true);
    }
  }, []);

  useEffect(() => {
    checkScrolledToBottom();
    window.addEventListener("resize", checkScrolledToBottom);
    return () => window.removeEventListener("resize", checkScrolledToBottom);
  }, [checkScrolledToBottom]);

  const signed = normalizeInitials(initials);
  const canConfirm = hasReadToBottom && agreed && signed !== null && !submitting;

  async function handleConfirm() {
    if (!canConfirm || signed === null) return;
    setError(null);
    setSubmitting(true);
    const message = await onConfirm(signed);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <>
      <div
        ref={boxRef}
        role="region"
        aria-label={waiver.title}
        tabIndex={0}
        onScroll={checkScrolledToBottom}
        className="scrollbar-brand max-h-56 overflow-y-auto rounded-xl border-[0.5px] border-brand-border bg-brand-surface p-4"
      >
        <p className="mb-3 text-sm font-semibold text-brand-text">
          {waiver.title}
        </p>
        <WaiverText text={waiver.text} />
      </div>
      {!hasReadToBottom && (
        <p className="-mt-1 text-xs text-brand-muted">
          Scroll to read the full agreement.
        </p>
      )}

      <label
        className={`flex items-start gap-3 ${hasReadToBottom ? "cursor-pointer" : "cursor-not-allowed"}`}
      >
        <input
          type="checkbox"
          checked={agreed}
          disabled={!hasReadToBottom}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-sm leading-snug text-brand-text">
          {waiver.checkboxLabel}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={initialsId}
          className="text-xs font-semibold uppercase tracking-wider text-brand-muted"
        >
          Sign with initials
        </label>
        <input
          id={initialsId}
          type="text"
          value={initials}
          disabled={!hasReadToBottom}
          onChange={(e) => setInitials(e.target.value)}
          maxLength={WAIVER_INITIALS_MAX}
          autoComplete="off"
          className="field-base px-4 py-3 text-base xl:text-sm text-brand-text disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="btn-tier-1 w-full flex items-center justify-center disabled:opacity-60"
        >
          {submitting ? busyLabel : confirmLabel}
        </button>
        {error && (
          <p role="alert" className="field-error text-center">
            {error}
          </p>
        )}
        <button
          onClick={onCancel}
          disabled={submitting}
          className="w-full flex items-center justify-center py-2.5 text-sm text-brand-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
