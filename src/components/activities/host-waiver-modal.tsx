"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { acceptWaiver } from "@/lib/actions/waivers";
import { WAIVERS } from "@/lib/waivers";
import WaiverAgreement from "@/components/activities/waiver-agreement";

// First-time host agreement, opened by the create form (new, duplicate, repeat)
// when the host waiver is not accepted at the current version. On confirm it
// records the acceptance, then hands back to the form via onAccepted so the form
// submits exactly as it always has. Edit never opens this.
export default function HostWaiverModal({
  onAccepted,
  onClose,
}: {
  onAccepted: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function confirm(initials: string): Promise<string | null> {
    const { error } = await acceptWaiver("host", initials);
    if (error) return error;
    onAccepted();
    return null;
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
      aria-label="Before you post"
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
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold leading-tight text-brand-text">
            Before you post
          </h2>
          <p className="text-xs text-brand-muted leading-snug">
            One time only. You will not see this again.
          </p>
        </div>
        <WaiverAgreement
          waiver={WAIVERS.host}
          confirmLabel="Post activity"
          busyLabel="Posting…"
          onConfirm={confirm}
          onCancel={onClose}
        />
      </motion.div>
    </motion.div>
  );
}
