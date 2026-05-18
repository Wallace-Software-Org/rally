"use client";

import { useEffect, useRef, useState } from "react";

type JoinButtonProps = {
  isJoined: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  spotsLeft: number;
  onJoin: () => void;
  onLeave: () => void;
  stopPropagation?: boolean; // set true inside clickable cards so the button doesn't also trigger onSelect
  className?: string; // overrides default w-20 h-7 text-[11px] sizing (e.g. larger tap targets on mobile)
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
  const sizeCls = className ?? "w-20 h-7 text-[11px]";
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

  function stop(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
  }

  if (isJoined) {
    return confirming ? (
      <button
        ref={btnRef}
        onClick={(e) => {
          stop(e);
          onLeave();
        }}
        disabled={isLeaving}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-red-500 text-red-500 font-semibold transition-colors disabled:opacity-50`}
      >
        {isLeaving ? "…" : "Leave"}
      </button>
    ) : (
      <button
        ref={btnRef}
        onClick={(e) => {
          stop(e);
          setConfirming(true);
        }}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white font-semibold transition-colors`}
      >
        Joined ✓
      </button>
    );
  }

  if (spotsLeft > 0) {
    return (
      <button
        onClick={(e) => {
          stop(e);
          onJoin();
        }}
        disabled={isJoining}
        className={`${sizeCls} flex items-center justify-center rounded-full border border-transparent bg-[#1D9E75] text-white font-semibold hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-50`}
      >
        {isJoining ? "…" : "Join"}
      </button>
    );
  }

  return null;
}
