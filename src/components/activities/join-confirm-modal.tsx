"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { JoinResult } from "@/types";
import { acceptWaiver } from "@/lib/actions/waivers";
import { WAIVERS } from "@/lib/waivers";
import { formatActivityDate } from "@/lib/utils/format-time";
import { useParticipantWaiver } from "@/hooks/use-participant-waiver";
import WaiverAgreement from "@/components/activities/waiver-agreement";

const JOIN_FAILED = "Could not join this activity";
const WAIVER_NOT_RECORDED =
  "We could not record your agreement. Please try again.";

// The one join confirmation every join surface opens (feed card, map popup,
// detail page); never fork it per surface. The parent mounts it when the user
// taps Join and passes its own join handler, which keeps that surface's
// { ok, full } handling (useForcedFull, router.refresh) untouched. This modal
// only decides which confirmation to show and reports back through onClose.
//
//   first time  : full waiver, checkbox, initials. acceptWaiver, then join.
//   after that  : short confirmation with the activity's date and place.
//
// `waiverAccepted` is what the server page saw. The mode is fixed at open (so an
// acceptance made inside the modal cannot swap the view out from under an
// error), except that a waiverRequired answer from the server forces first-time.
export default function JoinConfirmModal({
  activity,
  waiverAccepted,
  onJoin,
  onClose,
}: {
  activity: {
    title: string;
    starts_at: string | null;
    location_name: string | null;
  };
  waiverAccepted: boolean;
  onJoin: () => Promise<JoinResult>;
  onClose: () => void;
}) {
  const { accepted, markAccepted, markRequired } =
    useParticipantWaiver(waiverAccepted);
  // Read once at open: see the note above on why the mode must not follow live
  // changes to `accepted`.
  const [firstTime, setFirstTime] = useState(!accepted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Runs the surface's join and maps its outcome. Returns an error message for
  // the modal to show, or null when there is nothing to say (the join finished
  // and the modal closed, on success and on Full since the surface has already
  // flipped itself to Full, or the modal just switched to the first-time view).
  async function runJoin(justAccepted: boolean): Promise<string | null> {
    const result = await onJoin();
    if (result.waiverRequired) {
      // The server does not see an acceptance at the current version: ours is
      // stale (a version bump landed), or a write we just made has not landed.
      markRequired();
      setFirstTime(true);
      return justAccepted ? WAIVER_NOT_RECORDED : null;
    }
    if (result.ok || result.full) {
      onClose();
      return null;
    }
    return result.error || JOIN_FAILED;
  }

  async function confirmReturning() {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    setError(await runJoin(false));
    setSubmitting(false);
  }

  async function confirmFirstTime(initials: string): Promise<string | null> {
    const { error: acceptError } = await acceptWaiver("participant", initials);
    if (acceptError) return acceptError;
    markAccepted();
    return runJoin(true);
  }

  let when = "Date and time not set";
  if (activity.starts_at) {
    const { time, date } = formatActivityDate(activity.starts_at);
    when = `${date} · ${time}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={firstTime ? "Before you join" : `Join ${activity.title}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{
          opacity: 0,
          scale: 0.95,
          y: 8,
          transition: { duration: 0.15, ease: "easeIn" },
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-sm max-h-full overflow-y-auto rounded-2xl border-[0.5px] border-brand-border bg-brand-bg p-6 flex flex-col gap-4"
      >
        {firstTime ? (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold leading-tight text-brand-text">
                Before you join
              </h2>
              <p className="text-xs text-brand-muted leading-snug">
                One time only. You will not see this again.
              </p>
            </div>
            <WaiverAgreement
              waiver={WAIVERS.participant}
              confirmLabel="Join activity"
              busyLabel="Joining…"
              onConfirm={confirmFirstTime}
              onCancel={onClose}
            />
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold leading-snug text-brand-text">
              Join {activity.title}?
            </h2>

            <div className="h-px bg-brand-border" />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-brand-text">{when}</p>
              {activity.location_name && (
                <p className="text-sm text-brand-muted">
                  {activity.location_name}
                </p>
              )}
            </div>
            <div className="h-px bg-brand-border" />

            <p className="text-xs leading-relaxed text-brand-muted">
              Activities carry risk. Rally does not organize or supervise them,
              and hosts are participants, not guides. You accepted the{" "}
              <Link
                href="/waiver"
                target="_blank"
                rel="noopener noreferrer"
                className="link-action"
              >
                assumption of risk
              </Link>{" "}
              when you first joined.
            </p>

            <div className="flex flex-col gap-1">
              <button
                onClick={confirmReturning}
                disabled={submitting}
                className="btn-tier-1 w-full flex items-center justify-center disabled:opacity-60"
              >
                {submitting ? "Joining…" : "Join activity"}
              </button>
              {error && (
                <p role="alert" className="field-error text-center">
                  {error}
                </p>
              )}
              <button
                onClick={onClose}
                disabled={submitting}
                className="w-full flex items-center justify-center py-2.5 text-sm text-brand-muted hover:text-brand-text transition-colors duration-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
