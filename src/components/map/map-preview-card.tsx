'use client'

import { useEffect, useRef, useState } from 'react'
import type { ActivityWithParticipants } from '@/types'
import { SPORT_COLORS, getSportLabel } from '@/lib/utils/sport-config'
import { formatActivityTime } from '@/lib/utils/format-time'

type MapPreviewCardProps = {
  activity: ActivityWithParticipants
  isJoined: boolean
  isJoining: boolean
  isLeaving: boolean
  onJoin: () => void
  onLeave: () => void
  onDismiss: () => void
}

export default function MapPreviewCard({
  activity,
  isJoined,
  isJoining,
  isLeaving,
  onJoin,
  onLeave,
  onDismiss,
}: MapPreviewCardProps) {
  const [confirming, setConfirming] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) return
    function onOutside(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node)) setConfirming(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [confirming])

  const colors = SPORT_COLORS[activity.sport.toLowerCase()] ?? { bg: '#F4F4F5', text: '#52525B' }
  const participantCount = Array.isArray(activity.participants) ? activity.participants.length : 0
  const spotsLeft = activity.max_participants - participantCount

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[320px] rounded-2xl bg-white dark:bg-zinc-900 shadow-xl ring-[0.5px] ring-zinc-200 dark:ring-zinc-800 p-4 flex flex-col gap-3 z-10">
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Sport pill + time */}
      <div className="flex items-center gap-2 pr-8">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {getSportLabel(activity.sport)}
        </span>
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {formatActivityTime(activity.starts_at)}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
        {activity.title}
      </p>

      {/* Location + skill + spots */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="flex-none" aria-hidden="true">
            <path d="M4 0C2.07 0 .5 1.57.5 3.5.5 6.125 4 10 4 10S7.5 6.125 7.5 3.5C7.5 1.57 5.93 0 4 0Zm0 4.75A1.25 1.25 0 1 1 4 2.25a1.25 1.25 0 0 1 0 2.5Z" />
          </svg>
          {activity.location_name}
          {activity.skill_level && ` · ${activity.skill_level}`}
        </p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {spotsLeft <= 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
        </p>
      </div>

      {/* CTA */}
      {isJoined ? (
        confirming ? (
          <button
            ref={btnRef}
            onClick={() => onLeave()}
            disabled={isLeaving}
            className="w-full rounded-xl border border-red-500 text-red-500 text-sm font-semibold py-3 transition-colors disabled:opacity-50"
          >
            {isLeaving ? 'Leaving…' : 'Leave activity'}
          </button>
        ) : (
          <button
            ref={btnRef}
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl border border-transparent bg-[#E1F5EE] dark:bg-[#0F6E56]/20 text-[#1D9E75] text-sm font-semibold py-3 transition-colors"
          >
            You&apos;re in ✓
          </button>
        )
      ) : spotsLeft > 0 ? (
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="w-full rounded-xl border border-transparent bg-[#1D9E75] text-white text-sm font-semibold py-3 hover:bg-[#199068] active:bg-[#147a56] transition-colors disabled:opacity-50"
        >
          {isJoining ? 'Joining…' : 'Join this activity'}
        </button>
      ) : (
        <div className="flex items-center justify-center rounded-xl py-3 bg-zinc-100 dark:bg-zinc-800">
          <span className="text-sm font-medium text-zinc-400">Activity is full</span>
        </div>
      )}
    </div>
  )
}
