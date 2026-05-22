"use client";

import { useEffect, useRef, useState } from "react";

type JoinButtonProps = {
  isJoined: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  spotsLeft: number;
  onJoin: () => void;
  onLeave: () => void;
  stopPropagation?: boolean;
  className?: string;
};

export default function JoinButton({
  isJoined,
  isJoining,
  isLeaving,
  spotsLeft,
  onJoin,
  onLeave,
  stopPropagation = false,
  className,
}: JoinButtonProps) {
  const sizeCls = className ?? "w-20 h-7 text-xs";
  const [confirming, setConfirming] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [confirming]);

  let button: React.ReactNode = null;

  if (isJoined) {
    button = confirming ? (
      <button
        ref={btnRef}
        onClick={() => onLeave()}
        disabled={isLeaving}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-red-500 text-red-500 font-semibold transition-colors disabled:opacity-50`}
      >
        {isLeaving ? "…" : "Leave"}
      </button>
    ) : (
      <button
        ref={btnRef}
        onClick={() => setConfirming(true)}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-transparent bg-brand-teal text-white font-semibold transition-colors`}
      >
        Joined ✓
      </button>
    );
  } else if (spotsLeft > 0) {
    button = (
      <button
        onClick={() => onJoin()}
        disabled={isJoining}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-transparent bg-brand-teal text-white font-semibold hover:bg-brand-teal-hover active:bg-brand-teal-active transition-colors disabled:opacity-50`}
      >
        {isJoining ? "…" : "Join"}
      </button>
    );
  }

  if (!button) return null;

  if (stopPropagation) {
    return (
      <span onClick={(e) => e.stopPropagation()}>
        {button}
      </span>
    );
  }

  return button;
}
