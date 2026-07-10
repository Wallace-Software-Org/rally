"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { getInitials } from "@/lib/utils/avatar";
import { COPY_FEEDBACK_MS } from "@/lib/brand";

export type GroupChatParticipant = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
};

type Props = {
  participants: GroupChatParticipant[];
  isOpen: boolean;
  onClose: () => void;
};

// Stored handles may or may not carry a leading @; normalize to exactly one.
function formatHandle(handle: string): string {
  return `@${handle.replace(/^@+/, "")}`;
}

export default function GroupChatModal({
  participants,
  isOpen,
  onClose,
}: Props) {
  // Which button currently shows the "copied" state. Row buttons key on the
  // participant id; the copy-all button keys on "all".
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => setCopiedKey(null), COPY_FEEDBACK_MS);
  }

  // Handle-havers first, no-handle rows last; stable within each group.
  const withHandle = participants.filter((p) => p.instagram_handle);
  const withoutHandle = participants.filter((p) => !p.instagram_handle);
  const sorted = [...withHandle, ...withoutHandle];

  const allHandles = withHandle
    .map((p) => formatHandle(p.instagram_handle as string))
    .join(", ");

  return (
    <AnimatePresence>
      {isOpen && (
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
          aria-label="Invite to group chat"
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
            className="w-full max-w-sm rounded-2xl border-[0.5px] border-brand-border bg-brand-bg p-6 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold leading-tight text-brand-text">
                  Invite to group chat
                </h2>
                <p className="text-xs text-brand-muted leading-snug">
                  {withHandle.length} of {participants.length} going have
                  Instagram
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex-none w-8 h-8 rounded-full border-[0.5px] border-brand-border bg-brand-surface flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Roster */}
            <div className="scrollbar-brand flex flex-col gap-1 overflow-y-auto max-h-65 -mr-2 pr-2">
              {sorted.map((p) => {
                const hasHandle = Boolean(p.instagram_handle);
                const isCopied = copiedKey === p.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                      hasHandle ? "" : "opacity-50"
                    }`}
                  >
                    {/* Avatar */}
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt=""
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover flex-none"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-input flex-none flex items-center justify-center text-xs font-semibold text-brand-avatar-text">
                        {getInitials(p.full_name)}
                      </div>
                    )}

                    {/* Name + handle */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-brand-text truncate leading-tight">
                        {p.full_name}
                      </span>
                      <span className="text-xs text-brand-muted truncate leading-tight">
                        {hasHandle
                          ? formatHandle(p.instagram_handle as string)
                          : "No Instagram"}
                      </span>
                    </div>

                    {/* Per-row copy */}
                    {hasHandle && (
                      <button
                        onClick={() =>
                          copy(
                            formatHandle(p.instagram_handle as string),
                            p.id,
                          )
                        }
                        className="btn-tier-3 flex-none text-xs px-3 py-1.5"
                      >
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                        {isCopied ? "copied" : "copy"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Copy all */}
            <button
              onClick={() => copy(allHandles, "all")}
              disabled={withHandle.length === 0}
              className="btn-tier-1 w-full flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {copiedKey === "all" ? <CheckIcon /> : <CopyIcon />}
              {copiedKey === "all" ? "copied" : "copy all handles"}
            </button>

            {/* Instructions */}
            <p className="text-xs text-brand-muted leading-relaxed">
              <span className="text-brand-text font-medium">How to use:</span>{" "}
              open Instagram, start a new group chat, then add each person by
              their handle.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12.5l5 5 11-11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
